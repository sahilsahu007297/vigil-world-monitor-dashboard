export type NewsCategory = "all" | "breaking" | "regional" | "tech" | "business" | "security";

export type NewsChannel = {
  id: string;
  name: string;
  country: string;
  region: string;
  category: Exclude<NewsCategory, "all">;
  query: string;
  sourceKey?: string;
};

export type NewsArticle = {
  id: string;
  title: string;
  description: string;
  source: string;
  channel: string;
  time: string;
  category: Exclude<NewsCategory, "all">;
  country: string;
  url?: string;
  imageUrl?: string;
  sourceDomain?: string;
};

export const newsChannels: NewsChannel[] = [
  { id: "all-live", name: "All Sources (Google + Top Feeds)", country: "Global", region: "World", category: "breaking", query: "", sourceKey: "all" },
  { id: "google-news", name: "Google News", country: "Global", region: "World", category: "breaking", query: "world news", sourceKey: "google" },
  { id: "bbc", name: "BBC World", country: "United Kingdom", region: "Europe", category: "breaking", query: "", sourceKey: "bbc" },
  { id: "guardian", name: "The Guardian", country: "United Kingdom", region: "Europe", category: "regional", query: "", sourceKey: "guardian" },
  { id: "india-ndtv", name: "NDTV India", country: "India", region: "India", category: "breaking", query: "India", sourceKey: "ndtv" },
  { id: "india-times", name: "Times of India", country: "India", region: "India", category: "breaking", query: "India", sourceKey: "toi" },
  { id: "france24", name: "France 24", country: "France", region: "Europe", category: "regional", query: "", sourceKey: "france24" },
  { id: "skynews", name: "Sky News", country: "Global", region: "World", category: "breaking", query: "", sourceKey: "skynews" },
  { id: "aljazeera", name: "Al Jazeera", country: "Qatar", region: "Middle East", category: "regional", query: "", sourceKey: "aljazeera" },
  { id: "npr", name: "NPR World", country: "United States", region: "Americas", category: "regional", query: "", sourceKey: "npr" },
  { id: "india-all", name: "India National Desk", country: "India", region: "India", category: "breaking", query: "India", sourceKey: "all" },
  { id: "india-business", name: "Business India", country: "India", region: "India", category: "business", query: "India economy markets", sourceKey: "google" },
  { id: "india-security", name: "India Security Desk", country: "India", region: "India", category: "security", query: "India defence security border", sourceKey: "google" },
  { id: "tech", name: "Global Technology", country: "Global", region: "World", category: "tech", query: "technology AI semiconductors", sourceKey: "google" },
  { id: "markets", name: "Markets & Energy", country: "Global", region: "World", category: "business", query: "markets economy commodities oil", sourceKey: "google" },
  { id: "security", name: "Global Security Watch", country: "Global", region: "World", category: "security", query: "military defense conflict security", sourceKey: "google" },
];

export const sampleNews: NewsArticle[] = [
  {
    id: "sample-in-1",
    title: "India situational monitor tracks logistics corridors, renewable power and maritime security",
    description: "Multilateral ports, rail networks, and defense surveillance assets are synchronized across regional feeds.",
    source: "Times of India",
    channel: "india-times",
    time: "12m ago",
    category: "breaking",
    country: "India",
    imageUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&auto=format&fit=crop&q=80",
    url: "https://timesofindia.indiatimes.com",
    sourceDomain: "timesofindia.indiatimes.com",
  },
  {
    id: "sample-in-2",
    title: "Key Indian ports report steady throughput as global trade choke points face scrutiny",
    description: "Mundra, JNPT, and Cochin corridors observe active vessel movements with minimal transit disruption.",
    source: "NDTV",
    channel: "india-ndtv",
    time: "28m ago",
    category: "business",
    country: "India",
    imageUrl: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=600&auto=format&fit=crop&q=80",
    url: "https://www.ndtv.com",
    sourceDomain: "ndtv.com",
  },
  {
    id: "sample-gl-1",
    title: "Google News & Verified Desks scan global conflict, energy routes, and geopolitical shifts",
    description: "Continuous synchronization aggregating Google News, BBC, Guardian, France 24, and Sky News reports.",
    source: "Google News",
    channel: "google-news",
    time: "40m ago",
    category: "breaking",
    country: "Global",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    url: "https://news.google.com",
    sourceDomain: "news.google.com",
  },
  {
    id: "sample-gl-2",
    title: "International maritime task forces observe Red Sea and Persian Gulf critical straits",
    description: "Commercial shipping lanes report regular convoy passages and enhanced automated radar coverage.",
    source: "BBC World",
    channel: "bbc",
    time: "1h ago",
    category: "security",
    country: "Global",
    imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80",
    url: "https://www.bbc.com/news",
    sourceDomain: "bbc.com",
  },
  {
    id: "sample-gl-3",
    title: "Global semiconductor fabs and AI datacenters expand capacity across North America and Asia",
    description: "New hyperscale infrastructure and advanced packaging lines come online to meet accelerating compute demand.",
    source: "The Guardian",
    channel: "guardian",
    time: "2h ago",
    category: "tech",
    country: "Global",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80",
    url: "https://www.theguardian.com",
    sourceDomain: "theguardian.com",
  },
];
