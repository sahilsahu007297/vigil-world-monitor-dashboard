import type { IncomingMessage, ServerResponse } from 'node:http';

const cache = new Map<string, { expires: number; body: string }>();
let queue: Promise<unknown> = Promise.resolve();
let nextRequest = 0;

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function extractImage(itemXml: string): string | null {
  // 1. media:content
  const mediaContent = itemXml.match(/<media:content[^>]*\burl=["']([^"']+)["']/i)?.[1];
  if (mediaContent && /^https?:\/\//i.test(mediaContent)) return mediaContent.replace(/&amp;/g, '&');

  // 2. media:thumbnail
  const mediaThumb = itemXml.match(/<media:thumbnail[^>]*\burl=["']([^"']+)["']/i)?.[1];
  if (mediaThumb && /^https?:\/\//i.test(mediaThumb)) return mediaThumb.replace(/&amp;/g, '&');

  // 3. enclosure
  const enclosure = itemXml.match(/<enclosure[^>]*\burl=["']([^"']+)["']/i)?.[1];
  if (enclosure && /^https?:\/\//i.test(enclosure)) {
    const encTag = itemXml.match(/<enclosure[^>]*>/i)?.[0] || '';
    if (/image|\.(?:jpg|jpeg|png|webp|gif)/i.test(encTag) || /\.(?:jpg|jpeg|png|webp|gif)/i.test(enclosure)) {
      return enclosure.replace(/&amp;/g, '&');
    }
  }

  // 4. img src in description or content:encoded
  const imgSrc = itemXml.match(/<img[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
  if (imgSrc && /^https?:\/\//i.test(imgSrc)) return imgSrc.replace(/&amp;/g, '&');

  return null;
}

function extractDomain(urlStr: string, fallback = ''): string {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return fallback;
  }
}

export type FeedArticle = {
  id: string;
  title: string;
  link: string;
  published: string;
  source: string;
  domain: string;
  description: string;
  imageUrl?: string;
  category: string;
  country: string;
};

function parseRssFeed(xml: string, defaultSource: string, defaultCategory: string, defaultCountry: string): FeedArticle[] {
  const articles: FeedArticle[] = [];
  const matches = xml.matchAll(/<item\b[\s\S]*?<\/item>/gi);
  let index = 0;
  for (const match of matches) {
    index++;
    const item = match[0];
    const field = (name: string) => decodeXml(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '');
    
    const title = field('title');
    let link = field('link');
    if (!link) {
      const guid = item.match(/<guid[^>]*isPermaLink=["']true["'][^>]*>([\s\S]*?)<\/guid>/i)?.[1];
      if (guid && /^https?:\/\//i.test(guid.trim())) link = guid.trim();
    }
    if (!title || !link) continue;

    let source = defaultSource;
    let sourceUrl = '';
    const sourceTag = item.match(/<source[^>]*url=["']([^"']*)["'][^>]*>([\s\S]*?)<\/source>/i);
    if (sourceTag) {
      if (sourceTag[1]) sourceUrl = sourceTag[1];
      if (sourceTag[2]) {
        const parsedName = decodeXml(sourceTag[2]);
        if (parsedName) source = parsedName;
      }
    }

    const domain = extractDomain(sourceUrl || link, source.toLowerCase().replace(/[^a-z0-9]/g, ''));
    let imageUrl = extractImage(item);
    
    // If no direct image is in the RSS item, use high-resolution publisher brand icon from Google
    if (!imageUrl && domain) {
      imageUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;
    }

    const pubDateStr = field('pubDate') || field('dc:date') || field('updated') || field('published') || '';
    const description = decodeXml(field('description')) || title;
    articles.push({
      id: `${source}-${link}-${index}`,
      title,
      link,
      published: pubDateStr ? new Date(pubDateStr).toISOString() : new Date(Date.now() - index * 60000).toISOString(),
      source,
      domain,
      description,
      imageUrl: imageUrl || undefined,
      category: defaultCategory,
      country: defaultCountry,
    });
  }
  return articles;
}

async function publicNewsHandler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://localhost');
  const query = (url.searchParams.get('q') || '').trim().slice(0, 180);
  const countryParam = (url.searchParams.get('country') || '').trim();
  const categoryParam = (url.searchParams.get('category') || '').trim().toLowerCase();
  const sourceParam = (url.searchParams.get('source') || '').trim().toLowerCase();

  const isIndia = /india|bharat|^in$/i.test(countryParam) || /india/i.test(query);

  type SourceConfig = {
    id: string;
    name: string;
    url: string;
    category: string;
    country: string;
  };

  const allSources: SourceConfig[] = [];

  // 1. Google News
  let googleNewsUrl = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
  if (isIndia) {
    googleNewsUrl = 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en';
  }
  if (query) {
    const hl = isIndia ? 'en-IN' : 'en-US';
    const gl = isIndia ? 'IN' : 'US';
    const ceid = isIndia ? 'IN:en' : 'US:en';
    googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  } else if (categoryParam === 'tech') {
    googleNewsUrl = 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en';
  } else if (categoryParam === 'business') {
    googleNewsUrl = 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en';
  }

  allSources.push({ id: 'google', name: 'Google News', url: googleNewsUrl, category: categoryParam || 'breaking', country: isIndia ? 'India' : 'Global' });

  // 2. Best global sources with high quality images
  allSources.push(
    { id: 'bbc', name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'breaking', country: 'Global' },
    { id: 'guardian', name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', category: 'regional', country: 'Global' },
    { id: 'france24', name: 'France 24', url: 'https://www.france24.com/en/rss', category: 'regional', country: 'Europe' },
    { id: 'skynews', name: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/world.xml', category: 'breaking', country: 'Global' },
    { id: 'aljazeera', name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'regional', country: 'Middle East' },
    { id: 'npr', name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml', category: 'breaking', country: 'United States' },
  );

  // 3. Indian desks with rich image support
  allSources.push(
    { id: 'ndtv', name: 'NDTV', url: 'https://feeds.feedburner.com/ndtvnews-top-stories', category: 'breaking', country: 'India' },
    { id: 'toi', name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', category: 'breaking', country: 'India' },
  );

  // Filter sources if a specific source was requested
  let activeSources = allSources;
  if (sourceParam && sourceParam !== 'all') {
    const matched = allSources.filter(s => s.id === sourceParam || s.name.toLowerCase().includes(sourceParam));
    if (matched.length > 0) activeSources = matched;
  }

  // Prioritize India sources if India country desk was selected
  if (isIndia && (!sourceParam || sourceParam === 'all')) {
    activeSources = [
      ...allSources.filter(s => s.country === 'India'),
      ...allSources.filter(s => s.id === 'google'),
      ...allSources.filter(s => s.country !== 'India' && s.id !== 'google'),
    ];
  }

  const results = await Promise.allSettled(activeSources.map(async (src) => {
    const response = await fetch(src.url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    if (!response.ok) throw new Error(`${src.name} returned ${response.status}`);
    const xml = await response.text();
    return parseRssFeed(xml, src.name, src.category, src.country);
  }));

  // Balance articles across sources (take up to 10 per source so all sources are represented)
  const sourceBuckets: FeedArticle[][] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.length > 0) {
      sourceBuckets.push(r.value.slice(0, 12));
    }
  }

  let articles: FeedArticle[] = [];
  // Interleave buckets
  const maxInBucket = Math.max(0, ...sourceBuckets.map(b => b.length));
  for (let i = 0; i < maxInBucket; i++) {
    for (const b of sourceBuckets) {
      if (b[i]) articles.push(b[i]);
    }
  }

  // Filter by query keywords
  if (query) {
    const keywords = query
      .replace(/[()[\]"']/g, ' ')
      .split(/\s+/)
      .map(k => k.trim().toLowerCase())
      .filter(k => k && !['or', 'and', 'not', 'the', 'in', 'of', 'for'].includes(k));

    if (keywords.length > 0) {
      const matched = articles.filter(a => {
        const text = `${a.title} ${a.description} ${a.source} ${a.country}`.toLowerCase();
        return keywords.some(k => text.includes(k));
      });
      if (matched.length >= 3) {
        articles = matched;
      }
    }
  }

  // Filter by category if specified
  if (categoryParam && categoryParam !== 'all') {
    const catFiltered = articles.filter(a => a.category.toLowerCase() === categoryParam);
    if (catFiltered.length >= 5) articles = catFiltered;
  }

  // Prioritize articles with rich editorial photos
  articles.sort((a, b) => {
    const aHasPhoto = a.imageUrl && !a.imageUrl.includes('gstatic.com') ? 1 : 0;
    const bHasPhoto = b.imageUrl && !b.imageUrl.includes('gstatic.com') ? 1 : 0;
    if (aHasPhoto !== bHasPhoto) return bHasPhoto - aHasPhoto;
    const ta = Date.parse(a.published) || 0;
    const tb = Date.parse(b.published) || 0;
    return tb - ta;
  });

  // Limit to top 60
  articles = articles.slice(0, 60);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.end(JSON.stringify({ articles, total: articles.length, timestamp: new Date().toISOString() }));
}

async function nasaFireballHandler(req: IncomingMessage, res: ServerResponse) {
  const cacheKey = '__nasa_fireballs__';
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(hit.body);
    return;
  }
  try {
    const upstream = await fetch('https://ssd-api.jpl.nasa.gov/fireball.api?limit=40', {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: 'application/json', 'User-Agent': 'VIGIL/1.0 (Planetary Defense Monitor)' },
    });
    if (!upstream.ok) throw new Error(`NASA API returned ${upstream.status}`);
    const data = await upstream.json();
    const body = JSON.stringify(data);
    cache.set(cacheKey, { body, expires: Date.now() + 300000 });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(body);
  } catch (err: any) {
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'NASA Fireball service unavailable', message: err.message }));
  }
}

async function nasaCadHandler(req: IncomingMessage, res: ServerResponse) {
  const cacheKey = '__nasa_cad__';
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(hit.body);
    return;
  }
  try {
    const upstream = await fetch('https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&limit=40&sort=dist', {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: 'application/json', 'User-Agent': 'VIGIL/1.0 (Planetary Defense Monitor)' },
    });
    if (!upstream.ok) throw new Error(`NASA API returned ${upstream.status}`);
    const data = await upstream.json();
    const body = JSON.stringify(data);
    cache.set(cacheKey, { body, expires: Date.now() + 300000 });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(body);
  } catch (err: any) {
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'NASA CAD service unavailable', message: err.message }));
  }
}

// Fixed upstream only: this is not an arbitrary URL proxy.
export function publicFeedHandler(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  if (pathname === '/public-feeds/news') {
    if (req.method !== 'GET') { res.writeHead(405); res.end('{"error":"GET required"}'); return; }
    publicNewsHandler(req, res).catch(() => { if (!res.writableEnded) { res.writeHead(502); res.end('{"articles":[],"error":"News providers unavailable"}'); } });
    return;
  }
  if (pathname === '/public-feeds/nasa-fireballs') {
    if (req.method !== 'GET') { res.writeHead(405); res.end('{"error":"GET required"}'); return; }
    nasaFireballHandler(req, res).catch(() => { if (!res.writableEnded) { res.writeHead(502); res.end('{"error":"NASA Fireball handler error"}'); } });
    return;
  }
  if (pathname === '/public-feeds/nasa-cad') {
    if (req.method !== 'GET') { res.writeHead(405); res.end('{"error":"GET required"}'); return; }
    nasaCadHandler(req, res).catch(() => { if (!res.writableEnded) { res.writeHead(502); res.end('{"error":"NASA CAD handler error"}'); } });
    return;
  }
  const prefix = '/public-feeds/aircraft/';
  const photoPrefix = '/public-feeds/aircraft-photo/';
  if (pathname.startsWith(photoPrefix)) {
    if (req.method !== 'GET') { res.writeHead(405); res.end('GET required'); return; }
    const identifier = decodeURIComponent(pathname.slice(photoPrefix.length));
    const match = /^(hex|reg)\/([a-zA-Z0-9-]{2,12})$/.exec(identifier);
    if (!match) { res.writeHead(400); res.end('Invalid aircraft identifier'); return; }
    fetch(`https://api.planespotters.net/pub/photos/${match[1]}/${encodeURIComponent(match[2])}`, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } })
      .then(async response => {
        if (!response.ok) throw new Error(`Photo provider returned ${response.status}`);
        const data = await response.json();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=900');
        res.end(JSON.stringify(data));
      })
      .catch(() => { if (!res.writableEnded) { res.writeHead(502); res.end('{"photos":[],"error":"Aircraft photo unavailable"}'); } });
    return;
  }
  if (!pathname.startsWith(prefix)) return next();
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') { res.writeHead(405); res.end('{"error":"GET required"}'); return; }
  const path = pathname.slice(prefix.length);
  const point = /^point\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/250$/.exec(path);
  const lookup = /^(callsign|hex|reg|type)\/[a-zA-Z0-9-]{2,12}$/.test(path);
  if (!lookup && !(point && Math.abs(Number(point[1])) <= 90 && Math.abs(Number(point[2])) <= 180)) {
    res.writeHead(400); res.end('{"error":"Invalid aircraft query"}'); return;
  }
  const job = queue.then(async () => {
    if (res.destroyed) return;
    const hit = cache.get(path);
    if (hit && hit.expires > Date.now()) { res.end(hit.body); return; }
    await new Promise(resolve => setTimeout(resolve, Math.max(0, nextRequest - Date.now())));
    if (res.destroyed) return;
    nextRequest = Date.now() + 1100;
    try {
      const contact = process.env.FLIGHT_API_CONTACT?.trim();
      if (!contact || !/^(https:\/\/[^\s]+|[^\s@]+@[^\s@]+\.[^\s@]+)$/.test(contact)) {
        res.writeHead(503); res.end('{"error":"Set FLIGHT_API_CONTACT to your public project URL or contact email. ADSB.lol requires contact information in server requests."}'); return;
      }
      const response = await fetch(`https://api.adsb.lol/v2/${path}`, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json', 'User-Agent': `VIGIL/1.0 (${contact})` } });
      if (!response.ok) {
        if (response.status === 429) nextRequest = Date.now() + 60000;
        res.writeHead(response.status); res.end(JSON.stringify({ error: `ADSB.lol returned ${response.status}` })); return;
      }
      const data = await response.json();
      if (!Array.isArray(data.ac)) throw new Error('Unexpected provider response');
      const body = JSON.stringify(data);
      if (cache.size > 250) cache.clear();
      cache.set(path, { body, expires: Date.now() + 15000 });
      res.setHeader('Cache-Control', 'public, max-age=15');
      res.end(body);
    } catch {
      res.writeHead(502); res.end('{"error":"ADSB.lol unavailable"}');
    }
  });
  queue = job.catch(() => { if (!res.writableEnded) { res.writeHead(500); res.end('{"error":"Feed unavailable"}'); } });
}
