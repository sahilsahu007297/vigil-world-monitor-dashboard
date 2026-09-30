import type { IncomingMessage, ServerResponse } from 'node:http';
import * as satellite from 'satellite.js';
import { satelliteCatalog } from './satellite-catalog.ts';

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
    const publishedAt = pubDateStr ? Date.parse(pubDateStr) : NaN;
    articles.push({
      id: `${source}-${link}-${index}`,
      title,
      link,
      published: Number.isFinite(publishedAt) ? new Date(publishedAt).toISOString() : '',
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

async function usgsEarthquakesHandler(_req: IncomingMessage, res: ServerResponse) {
  const key = 'usgs:2.5-day';
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    res.setHeader('Content-Type', 'application/json');
    res.end(cached.body);
    return;
  }
  const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: 'application/geo+json, application/json' },
  });
  if (!response.ok) throw new Error(`USGS returned ${response.status}`);
  const feed = await response.json() as { metadata?: { generated?: number }; features?: Array<{ id?: string; properties?: Record<string, any>; geometry?: { coordinates?: number[] } }> };
  if (!Array.isArray(feed.features)) throw new Error('USGS returned an invalid feed');
  const earthquakes = feed.features.flatMap(feature => {
    const [lng, lat, depth] = feature.geometry?.coordinates || [];
    const p = feature.properties || {};
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(p.mag) || !Number.isFinite(p.time)) return [];
    return [{
      id: feature.id || `${p.time}-${lat}-${lng}`,
      lat, lng, depth: Number.isFinite(depth) ? depth : 0,
      magnitude: p.mag,
      place: typeof p.place === 'string' ? p.place : 'Location unavailable',
      time: p.time,
      url: typeof p.url === 'string' ? p.url : '',
      tsunami: Number(p.tsunami) || 0,
      type: typeof p.type === 'string' ? p.type : 'earthquake',
      felt: Number.isFinite(p.felt) ? p.felt : null,
      alert: typeof p.alert === 'string' ? p.alert : null,
    }];
  });
  const body = JSON.stringify({ earthquakes, total: earthquakes.length, timestamp: new Date(feed.metadata?.generated || Date.now()).toISOString() });
  cache.set(key, { body, expires: Date.now() + 30000 });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=30');
  res.end(body);
}

async function bitcoinPriceHandler(_req: IncomingMessage, res: ServerResponse) {
  const key = 'market:btc';
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    res.setHeader('Content-Type', 'application/json');
    res.end(cached.body);
    return;
  }
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`CoinGecko returned ${response.status}`);
  const data = await response.json() as { bitcoin?: { usd?: number; usd_24h_change?: number } };
  if (!Number.isFinite(data.bitcoin?.usd) || !Number.isFinite(data.bitcoin?.usd_24h_change)) throw new Error('CoinGecko returned an invalid quote');
  const body = JSON.stringify(data);
  cache.set(key, { body, expires: Date.now() + 60000 });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.end(body);
}

async function publicGeoFeedHandler(kind: 'wildfires' | 'weather-alerts', res: ServerResponse) {
  const cached = cache.get(`geo:${kind}`);
  if (cached && cached.expires > Date.now()) {
    res.setHeader('Content-Type', 'application/json');
    res.end(cached.body);
    return;
  }
  const upstream = kind === 'wildfires'
    ? 'https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=200'
    : 'https://api.weather.gov/alerts/active?status=actual&message_type=alert';
  const response = await fetch(upstream, {
    signal: AbortSignal.timeout(12000),
    headers: { Accept: 'application/json', 'User-Agent': 'VIGIL dashboard (public data)' },
  });
  if (!response.ok) throw new Error(`${kind} provider returned ${response.status}`);
  const data = await response.json() as { events?: unknown[]; features?: unknown[] };
  if (kind === 'wildfires' ? !Array.isArray(data.events) : !Array.isArray(data.features)) throw new Error(`${kind} provider returned an invalid feed`);
  const body = JSON.stringify(data);
  cache.set(`geo:${kind}`, { body, expires: Date.now() + 60000 });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.end(body);
}

async function issPositionHandler(_req: IncomingMessage, res: ServerResponse) {
  const key = 'orbit:iss';
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    res.setHeader('Content-Type', 'application/json');
    res.end(cached.body);
    return;
  }
  let position: { lat: number; lng: number; alt: number; timestamp: string };
  try {
    const tleKey = 'tle:iss';
    let tle = cache.get(tleKey)?.body;
    if (!tle || (cache.get(tleKey)?.expires || 0) <= Date.now()) {
      const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE', {
        signal: AbortSignal.timeout(12000),
        headers: { Accept: 'text/plain' },
      });
      if (!response.ok) throw new Error(`CelesTrak returned ${response.status}`);
      tle = await response.text();
      cache.set(tleKey, { body: tle, expires: Date.now() + 6 * 60 * 60 * 1000 });
    }
    const lines = tle.split(/\r?\n/);
    const line1 = lines.find(line => line.startsWith('1 '));
    const line2 = lines.find(line => line.startsWith('2 '));
    if (!line1 || !line2) throw new Error('CelesTrak TLE incomplete');
    const now = new Date();
    const state = satellite.propagate(satellite.twoline2satrec(line1, line2), now);
    if (!state?.position || typeof state.position === 'boolean') throw new Error('ISS orbit propagation failed');
    const geo = satellite.eciToGeodetic(state.position, satellite.gstime(now));
    position = { lat: satellite.degreesLat(geo.latitude), lng: satellite.degreesLong(geo.longitude), alt: geo.height, timestamp: now.toISOString() };
  } catch {
    const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544', {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`ISS provider returned ${response.status}`);
    const iss = await response.json() as { latitude?: number; longitude?: number; altitude?: number; timestamp?: number };
    if (!Number.isFinite(iss.latitude) || !Number.isFinite(iss.longitude) || !Number.isFinite(iss.altitude)) throw new Error('ISS provider returned invalid position');
    position = { lat: iss.latitude!, lng: iss.longitude!, alt: iss.altitude!, timestamp: iss.timestamp ? new Date(iss.timestamp * 1000).toISOString() : '' };
  }
  const body = JSON.stringify({
    satellites: [{ name: 'ISS (ZARYA)', lat: position.lat, lng: position.lng, alt: position.alt, mission: 'International Space Station', color: '#e9c5ff', category: 'station', noradId: '25544' }],
    total: 1,
    category_counts: { station: 1 },
    timestamp: position.timestamp,
  });
  cache.set(key, { body, expires: Date.now() + 5000 });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=5');
  res.end(body);
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
      articles = matched;
    }
  }

  // Filter by category if specified
  if (categoryParam && categoryParam !== 'all') {
    const catFiltered = articles.filter(a => a.category.toLowerCase() === categoryParam);
    articles = catFiltered;
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

async function publicCameraCatalog(res: ServerResponse) {
  const key = 'public:cctv';
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' });
    res.end(cached.body);
    return;
  }

  const getJson = async (url: string) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Camera provider returned ${response.status}`);
    return response.json() as Promise<any>;
  };
  const feeds = await Promise.allSettled([
    getJson('https://api.data.gov.sg/v1/transport/traffic-images').then(data =>
      (data.items?.[0]?.cameras || []).map((c: any) => ({
        id: `sg-${c.camera_id}`, name: `Singapore traffic ${c.camera_id}`,
        lat: c.location?.latitude, lng: c.location?.longitude,
        city: 'Singapore', country: 'Singapore', source: 'LTA / data.gov.sg',
        feed_url: c.image, stream_type: 'snapshot', captured_at: c.timestamp,
        external_url: 'https://data.gov.sg/datasets/d_6cdb6b405b25aaaacbaf7689bcc6fae0/view',
      }))),
    getJson('https://api.tfl.gov.uk/Place/Type/JamCam').then(data =>
      (Array.isArray(data) ? data : []).filter((c: any) => c.additionalProperties?.some((p: any) => p.key === 'available' && p.value === 'true')).map((c: any) => {
        const props = Object.fromEntries(c.additionalProperties.map((p: any) => [p.key, p.value])) as Record<string, string>;
        return { id: c.id, name: c.commonName, lat: c.lat, lng: c.lon,
          city: 'London', country: 'United Kingdom', source: 'Transport for London',
          feed_url: props.imageUrl, stream_url: props.videoUrl,
          stream_type: props.videoUrl ? 'mp4' : 'snapshot', external_url: 'https://tfl.gov.uk/traffic/status/' };
      })),
    getJson('https://tie.digitraffic.fi/api/weathercam/v1/stations').then(data =>
      (data.features || []).filter((c: any) => c.properties?.collectionStatus === 'GATHERING' && c.properties?.state !== 'REMOVED').flatMap((c: any) =>
        (c.properties.presets || []).filter((p: any) => p.inCollection).map((p: any) => ({
          id: `fi-${p.id}`, name: `${c.properties.name.replaceAll('_', ' ')} · ${p.id}`,
          lat: c.geometry?.coordinates?.[1], lng: c.geometry?.coordinates?.[0],
          country: 'Finland', source: 'Fintraffic / Digitraffic',
          stream_type: 'snapshot', feed_url: `https://weathercam.digitraffic.fi/${p.id}.jpg`,
          external_url: 'https://www.digitraffic.fi/en/road-traffic/',
        })))),
  ]);
  const cameras = feeds.flatMap(feed => feed.status === 'fulfilled' ? feed.value : [])
    .filter(camera => Number.isFinite(camera.lat) && Number.isFinite(camera.lng) &&
      [camera.stream_url, camera.feed_url].some(url => typeof url === 'string' && url.startsWith('https://')));
  if (!cameras.length) throw new Error('Camera providers unavailable');
  const body = JSON.stringify({ cameras, total: cameras.length, timestamp: new Date().toISOString() });
  cache.set(key, { body, expires: Date.now() + 60000 });
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' });
  res.end(body);
}

// ─────────────────────────────────────────────
// Fixed upstream only: this is not an arbitrary URL proxy.
export function publicFeedHandler(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  if (pathname === '/public-feeds/satellites') {
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    satelliteCatalog().then(data => { res.writeHead(200, { 'Content-Type':'application/json' }); res.end(JSON.stringify(data)); })
      .catch(() => { res.writeHead(503, { 'Content-Type':'application/json' }); res.end('{"error":"Orbital catalog unavailable"}'); });
    return;
  }

  const restoredFeeds = new Set(['flights', 'satellites', 'cctv', 'conflicts', 'cyber-threats', 'news', 'maritime', 'gdelt', 'live-news', 'health', 'cables']);
  const restoredName = pathname.replace('/public-feeds/osiris/', '');
  if (pathname === '/public-feeds/osiris/cctv') {
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    publicCameraCatalog(res).catch(() => { if (!res.writableEnded) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"error":"Public camera providers unavailable"}'); } });
    return;
  }
  if (pathname.startsWith('/public-feeds/osiris/') && restoredFeeds.has(restoredName)) {
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    const cached = cache.get(`osiris:${restoredName}`);
    if (cached && cached.expires > Date.now()) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(cached.body); return; }
    const upstream = restoredName === 'cables' ? 'https://www.osirisai.live/data/submarine-cables.json' : `https://www.osirisai.live/api/${restoredName}${restoredName === 'cctv' ? '?region=all' : ''}`;
    fetch(upstream, { signal: AbortSignal.timeout(restoredName === 'satellites' ? 120000 : 18000), headers: { Accept: 'application/json' } })
      .then(async response => {
        if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(String(data.error));
        const body = JSON.stringify(data);
        cache.set(`osiris:${restoredName}`, { expires: Date.now() + (restoredName === 'cables' ? 3600000 : restoredName === 'satellites' ? 60000 : 30000), body });
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(body);
      }).catch(() => { if (!res.writableEnded) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: `${restoredName} provider unavailable` })); } });
    return;
  }

  // ── Existing public feed routes ──
  if (pathname === '/public-feeds/earthquakes') {
    if (req.method !== 'GET') { res.writeHead(405); res.end('{"error":"GET required"}'); return; }
    usgsEarthquakesHandler(req, res).catch(() => { if (!res.writableEnded) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"error":"USGS feed unavailable"}'); } });
    return;
  }
  if (pathname === '/public-feeds/bitcoin') {
    if (req.method !== 'GET') { res.writeHead(405); res.end('{"error":"GET required"}'); return; }
    bitcoinPriceHandler(req, res).catch(() => { if (!res.writableEnded) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"error":"CoinGecko feed unavailable"}'); } });
    return;
  }
  if (pathname === '/public-feeds/wildfires' || pathname === '/public-feeds/weather-alerts') {
    if (req.method !== 'GET') { res.writeHead(405); res.end('{"error":"GET required"}'); return; }
    publicGeoFeedHandler(pathname.endsWith('wildfires') ? 'wildfires' : 'weather-alerts', res).catch(() => { if (!res.writableEnded) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"error":"Geographic feed unavailable"}'); } });
    return;
  }
  if (pathname === '/public-feeds/iss') {
    if (req.method !== 'GET') { res.writeHead(405); res.end('{"error":"GET required"}'); return; }
    issPositionHandler(req, res).catch(() => { if (!res.writableEnded) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"error":"ISS position unavailable"}'); } });
    return;
  }
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
