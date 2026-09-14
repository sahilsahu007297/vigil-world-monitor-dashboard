import { useEffect, useMemo, useState } from "react";
import { newsChannels, sampleNews, type NewsArticle, type NewsCategory } from "./newsdata";
import { fetchLiveNews } from "./services/news";

type NewsPanelProps = {
  onClose?: () => void;
};

export default function NewsPanel({ onClose }: NewsPanelProps) {
  const [selectedChannel, setSelectedChannel] = useState("all-live");
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>("all");
  const [country, setCountry] = useState("India");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [articles, setArticles] = useState<NewsArticle[]>(sampleNews);
  const [status, setStatus] = useState<"loading" | "live" | "sample">("loading");

  const selectedChannelData = newsChannels.find((c) => c.id === selectedChannel) || newsChannels[0];
  const countries = useMemo(
    () => ["India", "Global", ...Array.from(new Set(newsChannels.map((c) => c.country).filter((c) => c !== "India" && c !== "Global"))).sort()],
    []
  );
  const categories: NewsCategory[] = ["all", "breaking", "regional", "tech", "business", "security"];

  const visibleChannels = useMemo(
    () => newsChannels.filter((channel) => (country === "Global" ? true : channel.country === country || channel.region === country || channel.country === "Global")),
    [country]
  );

  useEffect(() => {
    if (!visibleChannels.some((channel) => channel.id === selectedChannel)) {
      setSelectedChannel(visibleChannels[0]?.id || "all-live");
    }
  }, [country, selectedChannel, visibleChannels]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      setStatus("loading");
      const query = activeSearch.trim() || selectedChannelData.query;
      const result = await fetchLiveNews({
        query,
        category: selectedCategory,
        country: country,
        source: selectedChannelData.sourceKey,
        signal: controller.signal,
      });

      if (!active) return;
      setArticles(result.articles);
      setStatus(result.status);
    };

    load();
    const interval = window.setInterval(load, 60000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [activeSearch, country, selectedCategory, selectedChannel, selectedChannelData]);

  const filteredArticles = articles.filter(
    (article) => selectedCategory === "all" || article.category === selectedCategory
  );

  return (
    <div className="news-panel">
      <div className="news-header">
        <div>
          <h2>Global & Live News Desk</h2>
          <p>Multi-source verification via Google News, BBC, The Guardian, NDTV, Times of India & Sky News.</p>
        </div>
        {onClose && <button className="close-btn" onClick={onClose} aria-label="Close news modal">×</button>}
      </div>

      <div className="news-toolbar">
        <div className="control-group">
          <label>Country desk</label>
          <select value={country} onChange={(event) => setCountry(event.target.value)}>
            {countries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <form
          className="news-search-form"
          onSubmit={(e) => {
            e.preventDefault();
            setActiveSearch(searchQuery.trim());
          }}
        >
          <input
            type="text"
            placeholder="Search Google News & feeds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search live news"
          />
          <button type="submit">SEARCH</button>
          {activeSearch && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => {
                setSearchQuery("");
                setActiveSearch("");
              }}
              title="Clear search"
            >
              ×
            </button>
          )}
        </form>

        <div className="category-buttons">
          {categories.map((cat) => (
            <button
              key={cat}
              className={selectedCategory === cat ? "active" : ""}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="channels-grid wide">
        {visibleChannels.map((channel) => (
          <button
            key={channel.id}
            className={selectedChannel === channel.id ? "active" : ""}
            onClick={() => {
              setSelectedChannel(channel.id);
              setActiveSearch("");
              setSearchQuery("");
            }}
          >
            <strong>{channel.name}</strong>
            <span>
              {channel.country} / {channel.category}
            </span>
          </button>
        ))}
      </div>

      <div className="feed-header">
        <div className="feed-header-title">
          <h3>{selectedChannelData.name}</h3>
          {activeSearch && <span className="feed-search-scope">Matching &ldquo;{activeSearch}&rdquo;</span>}
        </div>
        <span className={status === "live" ? "feed live" : "feed sample"}>
          {status === "loading" ? "SCANNING LIVE FEEDS…" : status === "live" ? "LIVE VERIFIED" : "FALLBACK CACHE"}
        </span>
      </div>

      <div className="articles-list">
        {filteredArticles.length === 0 && (
          <div className="news-empty">
            {status === "loading" ? "Retrieving live stories from Google News & verified sources…" : "No matching articles found for this channel and filter."}
          </div>
        )}
        {filteredArticles.map((article) => {
          const body = (
            <>
              {article.imageUrl ? (
                <div className="article-thumb-wrapper">
                  <img
                    className="article-thumb"
                    src={article.imageUrl}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      // Graceful fallback to publisher domain badge or hide
                      const target = e.currentTarget;
                      if (article.sourceDomain && !target.src.includes("gstatic.com")) {
                        target.src = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${article.sourceDomain}&size=128`;
                      } else {
                        target.style.display = "none";
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="article-thumb-wrapper">
                  <div className="article-thumb news-thumb-placeholder">NEWS</div>
                </div>
              )}
              <div className="article-content">
                <div className="article-meta-top">
                  <span className="article-source-pill">
                    {article.sourceDomain && (
                      <img
                        className="article-source-icon"
                        src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${article.sourceDomain}&size=32`}
                        alt=""
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                    {article.source}
                  </span>
                  <span className="article-time">{article.time}</span>
                  <span className="article-category">{article.category}</span>
                </div>
                <h4 className="article-headline">{article.title}</h4>
                <p className="article-description">{article.description}</p>
                <div className="article-footer">
                  <span>{article.country}</span>
                  <span className="article-read-more">Open Article →</span>
                </div>
              </div>
            </>
          );

          return article.url ? (
            <a
              key={article.id}
              className="news-article with-image"
              href={article.url}
              target="_blank"
              rel="noreferrer"
            >
              {body}
            </a>
          ) : (
            <div key={article.id} className="news-article with-image">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
