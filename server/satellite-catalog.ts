import * as satellite from 'satellite.js';
import seed from './data/satellite-elements.json' with { type: 'json' };

type Element = satellite.OMMJsonObject;
let elements = seed.elements as Element[];
let retrievedAt = Date.parse(seed.retrievedAt);
let refreshing: Promise<void> | null = null;
let nextAttempt = retrievedAt + 2 * 60 * 60 * 1000;
let records = elements.map(element => ({ element, record: satellite.json2satrec(element) }));
let cached: { time: number; data: ReturnType<typeof propagateCatalog> } | null = null;

function propagateCatalog() {
  const now = new Date();
  const gmst = satellite.gstime(now);
  const satellites = records.flatMap(({ element, record }) => {
    try {
      const state = satellite.propagate(record, now);
      if (!state?.position || typeof state.position === 'boolean') return [];
      const geo = satellite.eciToGeodetic(state.position, gmst);
      if (!Number.isFinite(geo.height) || geo.height < 100 || geo.height > 100000) return [];
      const name = element.OBJECT_NAME || `NORAD ${element.NORAD_CAT_ID}`;
      const category = /STARLINK/i.test(name) ? 'Starlink' : /ONEWEB/i.test(name) ? 'OneWeb' : /ISS \(|TIANGONG/i.test(name) ? 'station' : 'orbital';
      return [{ name, noradId: String(element.NORAD_CAT_ID), lat:satellite.degreesLat(geo.latitude), lng:satellite.degreesLong(geo.longitude), alt:geo.height,
        category, color:category === 'station' ? '#ffe69c' : '#7fd6f5', mission:'SGP4 position from CelesTrak orbital elements', epoch:element.EPOCH }];
    } catch { return []; }
  });
  return { satellites, total:satellites.length, category_counts:satellites.reduce<Record<string,number>>((counts,sat) => { counts[sat.category]=(counts[sat.category] || 0)+1; return counts; },{}),
    timestamp:now.toISOString(), source:'CelesTrak GP / SGP4', elementsRetrievedAt:new Date(retrievedAt).toISOString() };
}

async function refresh() {
  const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json', { signal:AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`CelesTrak HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data) || data.length < 1000) throw new Error('Incomplete orbital catalog');
  const next = data.filter((item: Element) => item.NORAD_CAT_ID && item.EPOCH && Number.isFinite(item.MEAN_MOTION));
  records = next.flatMap((element: Element) => { try { return [{ element, record:satellite.json2satrec(element) }]; } catch { return []; } });
  elements = next;
  retrievedAt = Date.now(); cached = null;
}

export async function satelliteCatalog() {
  if (Date.now() >= nextAttempt && !refreshing) {
    nextAttempt = Date.now() + 2 * 60 * 60 * 1000;
    refreshing = refresh().catch(error => console.warn('CelesTrak refresh unavailable:', error.message)).finally(() => { refreshing = null; });
  }
  if (Date.now() - retrievedAt > 14 * 86400000) {
    await refreshing;
    if (Date.now() - retrievedAt > 14 * 86400000) throw new Error('Orbital elements expired; waiting for CelesTrak');
  }
  if (!cached || Date.now() - cached.time > 20000) cached = { time:Date.now(), data:propagateCatalog() };
  return cached.data;
}
