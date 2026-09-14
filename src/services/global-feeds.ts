/**
 * Global OSINT Platform — Service Layer for VIGIL Dashboard
 * 
 * Proxies free, keyless public data sources into
 * normalised TypeScript interfaces. Includes:
 *   • Per-endpoint cache with configurable TTL
 *   • Automatic retry (1x) on transient failures
 *   • Typed response shapes matching JSON contracts
 *   • Feed-status reporting (live / stale / error)
 */

// ──────────────────── Configuration ────────────────────

const PROXY_BASE = "/api";

/** Recommended polling intervals per feed (seconds). */
export const POLL_INTERVALS: Record<string, number> = {
  health:        60,
  earthquakes:   30,
  flights:       30,
  fires:         60,
  conflicts:    300,
  cyberThreats: 300,
  news:          90,
  airQuality:   300,
  spaceWeather: 300,
  countryRisk:  600,
  gdelt:         90,
  cctv:         600,
  satellites:   60,
};

// ──────────────────── Types ────────────────────

export interface GlobalHealth {
  status: string;
  uptime?: number;
  timestamp?: string;
}

// — Earthquakes ——————————————————————————————

export interface GlobalEarthquake {
  id: string;
  lat: number;
  lng: number;
  depth: number;
  magnitude: number;
  place: string;
  time: number;
  url: string;
  tsunami: number;
  type: string;
  felt: number | null;
  alert: string | null;
}

export interface GlobalEarthquakesResponse {
  earthquakes: GlobalEarthquake[];
  total: number;
  timestamp: string;
}

// — Flights ——————————————————————————————

export interface GlobalFlight {
  telemetry?: Record<string, unknown>;
  observedAt?: number;
  source?: string;
  callsign: string;
  lat: number;
  lng: number;
  alt: number;
  heading: number;
  speed_knots: number;
  model: string;
  icao24: string;
  registration: string;
  squawk: string;
  airline_code: string;
  aircraft_category: string;
  category: string;
  grounded: boolean;
  type: string;
}

export interface GlobalFlightsResponse {
  commercial_flights: GlobalFlight[];
  military_flights?: GlobalFlight[];
  private_flights?: GlobalFlight[];
  source?: string;
  total?: number;
  timestamp?: string;
}

// — Conflicts ——————————————————————————————

export interface GlobalConflictEvent {
  id: string;
  lat: number;
  lng: number;
  title: string;
  url: string;
  type: string;
  timestamp: string;
}

export interface GlobalConflictZone {
  id: string;
  label: string;
  severity: "war" | "high" | "elevated" | "low";
  lat: number;
  lng: number;
  description: string;
  sourceUrl: string;
  region: string;
  events: GlobalConflictEvent[];
  eventCount: number;
  lastUpdated: string;
}

export interface GlobalConflictsResponse {
  zones: GlobalConflictZone[];
  liveEvents: GlobalConflictEvent[];
  totalZones: number;
  totalLiveEvents: number;
  activeWarzones: number;
  timestamp: string;
  sources: string[];
  refreshInterval: number;
}

// — Cyber Threats ——————————————————————————————

export interface GlobalCyberThreat {
  id: string;
  name: string;
  vendor: string;
  product: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  date: string;
  due: string;
  source: string;
}

export interface GlobalCyberThreatsResponse {
  threats: GlobalCyberThreat[];
  stats: {
    cisa_total: number;
    shadowserver: string;
    active_cves: number;
    threat_level: string;
  };
  timestamp: string;
}

// — News ——————————————————————————————

export interface GlobalNewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  published: string;
  source: string;
  risk_score: number;
  coords: [number, number] | null;
  coords_default: boolean;
  machine_assessment: string | null;
  image_url?: string;
}

export interface GlobalNewsResponse {
  news: GlobalNewsItem[];
  total: number;
  timestamp: string;
}

// — CCTV / Cameras —————————————————————

export interface GlobalCamera {
  captured_at?: string;
  id: string;
  name: string;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  source?: string;
  feed_url?: string;
  stream_url?: string;
  stream_type?: string;
  external_url?: string;
}

export interface GlobalCamerasResponse {
  cameras: GlobalCamera[];
  total: number;
  timestamp: string;
}

// — Satellites —————————————————————

export interface GlobalSatellite {
  name: string;
  lat: number;
  lng: number;
  alt: number;
  mission: string;
  color: string;
  category: string;
  noradId: string;
}

export interface GlobalSatellitesResponse {
  satellites: GlobalSatellite[];
  total: number;
  category_counts: Record<string, number>;
  timestamp: string;
}


// ──────────────────── Cache ────────────────────

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  ttlMs: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > entry.ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlSeconds: number): void {
  cache.set(key, { data, fetchedAt: Date.now(), ttlMs: ttlSeconds * 1000 });
}

// ──────────────────── Transport ────────────────────

export type FeedState = "live" | "stale" | "error";

async function proxyFetch<T>(
  endpoint: string,
  ttlSeconds: number,
  signal?: AbortSignal,
): Promise<{ data: T; state: FeedState }> {
  const cacheKey = `proxy:${endpoint}`;

  // 1. Try cache first
  const cached = getCached<T>(cacheKey);
  if (cached) return { data: cached, state: "live" };

  // 2. Fetch with one automatic retry
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${PROXY_BASE}${endpoint}`, {
        signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`PROXY ${endpoint} → ${res.status}`);
      const data = (await res.json()) as T;
      setCache(cacheKey, data, ttlSeconds);
      return { data, state: "live" };
    } catch (err) {
      lastError = err;
      if (signal?.aborted) break;
      if (attempt === 0) await new Promise(r => setTimeout(r, 800));
    }
  }

  // 3. Return stale cache if available
  const stale = cache.get(cacheKey) as CacheEntry<T> | undefined;
  if (stale) return { data: stale.data, state: "stale" };

  throw lastError;
}

// ──────────────────── Public API ────────────────────

/** Health check — confirms the proxy is reachable. */
export async function checkHealth(signal?: AbortSignal) {
  return proxyFetch<GlobalHealth>("/health", 60, signal);
}

/** USGS earthquakes (M2.5+ recent). */
export async function fetchEarthquakes(signal?: AbortSignal) {
  return proxyFetch<GlobalEarthquakesResponse>("/earthquakes", POLL_INTERVALS.earthquakes, signal);
}

/** Live ADS-B flight positions. */
export async function fetchFlights(signal?: AbortSignal) {
  return proxyFetch<GlobalFlightsResponse>("/flights", POLL_INTERVALS.flights, signal);
}

/** Global conflict zones with live events. */
export async function fetchConflicts(signal?: AbortSignal) {
  return proxyFetch<GlobalConflictsResponse>("/conflicts", POLL_INTERVALS.conflicts, signal);
}

/** CISA KEV active cyber threats. */
export async function fetchCyberThreats(signal?: AbortSignal) {
  return proxyFetch<GlobalCyberThreatsResponse>("/cyber-threats", POLL_INTERVALS.cyberThreats, signal);
}

/** OSINT news feed (Telegram + live sources). */
export async function fetchNews(signal?: AbortSignal) {
  return proxyFetch<GlobalNewsResponse>("/news", POLL_INTERVALS.news, signal);
}

/** CCTV public camera feeds. */
export async function fetchCameras(signal?: AbortSignal) {
  return proxyFetch<GlobalCamerasResponse>("/cctv", POLL_INTERVALS.cctv, signal);
}

/** Satellites TLE data and computed positions. */
export async function fetchSatellites(signal?: AbortSignal) {
  return proxyFetch<GlobalSatellitesResponse>("/satellites", POLL_INTERVALS.satellites, signal);
}

/** Invalidate a specific cached endpoint. */
export function invalidateCache(endpoint: string): void {
  cache.delete(`proxy:${endpoint}`);
}

/** Invalidate everything. */
export function clearAllCache(): void {
  cache.clear();
}
