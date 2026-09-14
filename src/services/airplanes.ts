import type { GlobalFlight } from './global-feeds';

export type Aircraft = Record<string, unknown> & { hex: string };
export type SearchKind = 'callsign' | 'hex' | 'reg' | 'type';
let queue: Promise<unknown> = Promise.resolve();
let nextRequest = 0;
let blockedUntil = 0;
const cache = new Map<string, { time: number; data: GlobalFlight[] }>();
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : NaN;
const str = (v: unknown) => typeof v === 'string' ? v.trim() : '';

export function normalizeAircraft(a: Aircraft, now: number): GlobalFlight {
  return {
    icao24: a.hex, callsign: str(a.flight), registration: str(a.r),
    lat: num(a.lat), lng: num(a.lon), alt: a.alt_baro === 'ground' ? 0 : num(a.alt_baro) * 0.3048,
    heading: num(a.track), speed_knots: num(a.gs), grounded: a.alt_baro === 'ground',
    model: str(a.desc), type: str(a.t), airline_code: str(a.ownOp),
    aircraft_category: str(a.category), category: (num(a.dbFlags) & 1) ? 'Military' : 'Civil / unclassified',
    squawk: str(a.squawk), telemetry: a, observedAt: now, source: 'Airplanes.live',
  };
}

export function aircraftRequest(path: string, signal?: AbortSignal): Promise<GlobalFlight[]> {
  const job = queue.then(async () => {
    signal?.throwIfAborted();
    const hit = cache.get(path);
    if (hit && Date.now() - hit.time < 15000) return hit.data;
    await new Promise(resolve => setTimeout(resolve, Math.max(0, nextRequest - Date.now())));
    signal?.throwIfAborted();
    nextRequest = Date.now() + 1100;
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      let source = 'Airplanes.live';
      let response: Response | undefined;
      if (Date.now() >= blockedUntil) {
        try { response = await fetch(`https://api.airplanes.live/v2/${path}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) }); } catch { signal?.throwIfAborted(); }
      }
      if (!response?.ok) {
        blockedUntil = Date.now() + 300000;
        source = 'ADSB.lol (Airplanes.live unavailable)';
        response = await fetch(`/public-feeds/aircraft/${path}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
      }
      if (response.status === 429) { nextRequest = Date.now() + 60000; throw new Error('Flight provider rate limit reached. Retry in one minute.'); }
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(typeof error?.error === 'string' ? error.error : `Flight providers unavailable (HTTP ${response.status}).`);
      }
      const body = await response.json();
      if (!Array.isArray(body.ac)) throw new Error('Airplanes.live returned an unexpected response.');
      const data = body.ac.filter((a: Aircraft) => typeof a.hex === 'string').map((a: Aircraft) => ({ ...normalizeAircraft(a, typeof body.now === 'number' ? body.now : Date.now()), source }));
      if (cache.size > 100) cache.clear();
      cache.set(path, { time: Date.now(), data });
      return data;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof TypeError) throw new Error('Cannot reach Airplanes.live. Network, browser CORS, or provider access restrictions may apply.');
      throw error;
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  });
  queue = job.catch(() => undefined);
  return job;
}

export function searchAircraft(kind: SearchKind, value: string, signal?: AbortSignal) {
  const query = value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{2,12}$/.test(query) || (kind === 'hex' && !/^[A-F0-9]{6}$/.test(query))) throw new Error('Enter a valid exact callsign, registration, ICAO type, or six-digit hex code.');
  return aircraftRequest(`${kind}/${encodeURIComponent(query)}`, signal);
}

export function nearbyAircraft(lat: number, lon: number, signal?: AbortSignal) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('Invalid map coordinates.');
  return aircraftRequest(`point/${lat.toFixed(2)}/${lon.toFixed(2)}/250`, signal);
}

export function isAircraftPosition(f: GlobalFlight) {
  return Number.isFinite(f.lat) && Number.isFinite(f.lng) && Math.abs(f.lat) <= 90 && Math.abs(f.lng) <= 180;
}

export function hasPosition(f: GlobalFlight) {
  const age = Math.max(0, (Date.now() - (f.observedAt ?? Date.now())) / 1000) + (typeof f.telemetry?.seen_pos === 'number' ? f.telemetry.seen_pos : 0);
  return Number.isFinite(f.lat) && Number.isFinite(f.lng) && Math.abs(f.lat) <= 90 && Math.abs(f.lng) <= 180 && age <= 90;
}
