import { sampleNews, type NewsArticle, type NewsCategory } from "../newsdata";

export type LiveNewsParams = {
  query?: string;
  category?: NewsCategory;
  country?: string;
  source?: string;
  signal?: AbortSignal;
};

export function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "recent";
  const parsed = Date.parse(dateStr);
  if (isNaN(parsed)) {
    // Check if format is YYYYMMDDTHHMMSSZ (GDELT format)
    const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(dateStr);
    if (m) {
      const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
      const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
      if (mins < 60) return `${mins}m ago`;
      if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
      return `${Math.round(mins / 1440)}d ago`;
    }
    return dateStr;
  }
  const mins = Math.max(0, Math.round((Date.now() - parsed) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export async function fetchLiveNews(params: LiveNewsParams = {}): Promise<{ articles: NewsArticle[]; status: "live" | "sample" }> {
  const { query = "", category = "all", country = "", source = "", signal } = params;

  try {
    const searchParams = new URLSearchParams();
    if (query.trim()) searchParams.set("q", query.trim());
    if (category && category !== "all") searchParams.set("category", category);
    if (country && country !== "Global") searchParams.set("country", country);
    if (source && source !== "all") searchParams.set("source", source);

    const qs = searchParams.toString();
    const endpoint = `/public-feeds/news${qs ? `?${qs}` : ""}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

    const response = await fetch(endpoint, {
      signal: combinedSignal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (Array.isArray(data?.articles) && data.articles.length > 0) {
      const articles: NewsArticle[] = data.articles.map((item: any, index: number) => {
        const domain = item.domain || (item.link ? new URL(item.link).hostname.replace(/^www\./, "") : "");
        const fallbackIcon = domain
          ? `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`
          : undefined;

        return {
          id: item.id || `news-${index}`,
          title: item.title || "Untitled report",
          description: item.description || "Live monitored report from verified news desk.",
          source: item.source || domain || "Google News",
          channel: source || "live-feed",
          time: formatTimeAgo(item.published),
          category: (item.category as any) || (category !== "all" ? category : "breaking"),
          country: item.country || (country || "Global"),
          url: item.link,
          imageUrl: item.imageUrl || fallbackIcon,
          sourceDomain: domain,
        };
      });

      return { articles, status: "live" };
    }
  } catch (err) {
    console.warn("Primary news endpoint failed, using fallback:", err);
  }

  // Resilient fallback filtering
  let filtered = [...sampleNews];
  if (country && country !== "Global") {
    const byCountry = filtered.filter(a => a.country.toLowerCase() === country.toLowerCase());
    if (byCountry.length > 0) filtered = byCountry;
  }
  if (category && category !== "all") {
    const byCat = filtered.filter(a => a.category === category);
    if (byCat.length > 0) filtered = byCat;
  }

  return { articles: filtered, status: "sample" };
}
