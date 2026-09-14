import type { GlobalCamera } from './global-feeds';
import { fetchCameras } from './global-feeds';

async function json(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  return response.json();
}

export async function publicCameras(signal?: AbortSignal) {
  const feeds = await Promise.allSettled([
    fetchCameras(signal).then(({ data }) => {
      if (!Array.isArray(data.cameras)) throw new Error('Worldwide CCTV response did not include cameras');
      return data.cameras.map((camera): GlobalCamera => ({
        ...camera,
        source: camera.source || 'OSIRIS public CCTV aggregator',
      }));
    }),
    json('https://api.data.gov.sg/v1/transport/traffic-images', signal).then(data => {
      if (!Array.isArray(data.items?.[0]?.cameras)) throw new Error('Unexpected camera response');
      return data.items[0].cameras.map((c: any): GlobalCamera => ({ id: `sg-${c.camera_id}`, name: `Singapore traffic ${c.camera_id}`, lat: c.location.latitude, lng: c.location.longitude, city: 'Singapore', country: 'Singapore', source: 'LTA / data.gov.sg', feed_url: c.image, stream_type: 'snapshot', captured_at: c.timestamp, external_url: 'https://data.gov.sg/datasets/d_6cdb6b405b25aaaacbaf7689bcc6fae0/view' }));
    }),
    json('https://api.tfl.gov.uk/Place/Type/JamCam', signal).then(data => {
      if (!Array.isArray(data)) throw new Error('Unexpected camera response');
      return data.filter((c: any) => c.additionalProperties?.some((p: any) => p.key === 'available' && p.value === 'true')).map((c: any): GlobalCamera => {
        const props = Object.fromEntries(c.additionalProperties.map((p: any) => [p.key, p.value]));
        return { id: c.id, name: c.commonName, lat: c.lat, lng: c.lon, city: 'London', country: 'United Kingdom', source: 'Transport for London', feed_url: props.imageUrl, stream_url: props.videoUrl, stream_type: props.videoUrl ? 'mp4' : 'snapshot', external_url: 'https://tfl.gov.uk/traffic/status/' };
      });
    }),
    json('https://tie.digitraffic.fi/api/weathercam/v1/stations', signal).then(data => {
      if (!Array.isArray(data.features)) throw new Error('Unexpected camera response');
      return data.features.filter((c: any) => c.properties.collectionStatus === 'GATHERING' && c.properties.state !== 'REMOVED').flatMap((c: any) => c.properties.presets.filter((p: any) => p.inCollection).map((p: any): GlobalCamera => ({ id: `fi-${p.id}`, name: `${c.properties.name.replaceAll('_', ' ')} · ${p.id}`, lat: c.geometry.coordinates[1], lng: c.geometry.coordinates[0], country: 'Finland', source: 'Fintraffic / Digitraffic', stream_type: 'snapshot', feed_url: `https://weathercam.digitraffic.fi/${p.id}.jpg`, external_url: 'https://www.digitraffic.fi/en/road-traffic/' })));
    }),
    json('https://data.cityofnewyork.us/resource/i4gi-tjb9.json?$limit=5000', signal).then(data => {
      if (!Array.isArray(data)) throw new Error('Unexpected NYC camera response');
      return data.map((camera: any, index: number): GlobalCamera => ({
        id: `nyc-dot-${camera.id || camera.camera_id || index}`,
        name: camera.name || camera.location || `NYC DOT traffic camera ${index + 1}`,
        lat: Number(camera.latitude || camera.lat),
        lng: Number(camera.longitude || camera.lon || camera.lng),
        city: 'New York City',
        country: 'United States',
        source: 'NYC Open Data / DOT',
        feed_url: camera.image_url || camera.imageurl || camera.url,
        stream_type: 'snapshot',
        external_url: 'https://data.cityofnewyork.us/',
      }));
    }),
  ]);
  const names = ['Worldwide open CCTV aggregator', 'Singapore LTA', 'London TfL', 'Finland Digitraffic', 'NYC Open Data'];
  const cameras = feeds.flatMap(f => f.status === 'fulfilled' ? f.value : [])
    .filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng));
  const unique = [...new Map(cameras.map(camera => [`${camera.id}:${camera.lat}:${camera.lng}`, camera])).values()];
  const errors = feeds.flatMap((f, i) => f.status === 'rejected' ? [`${names[i]}: ${f.reason.message}`] : []);
  return { cameras: unique, errors };
}

export async function windyCameras(key: string, country: string, offset: number, signal?: AbortSignal) {
  if (country && !/^[A-Z]{2}$/.test(country)) throw new Error('Use a two-letter country code, e.g. IN, US, JP.');
  const params = new URLSearchParams({ include: 'location,player,urls', limit: '50', offset: String(offset) });
  if (country) params.set('countries', country);
  const response = await fetch(`https://api.windy.com/webcams/api/v3/webcams?${params}`, { headers: { 'x-windy-api-key': key }, signal });
  if (!response.ok) throw new Error(`Windy unavailable (HTTP ${response.status}). Check your Webcams API key and plan.`);
  const data = await response.json();
  if (!Array.isArray(data.webcams)) throw new Error('Unexpected Windy response');
  return { total: data.total as number, cameras: data.webcams.map((c: any): GlobalCamera => ({ id: `windy-${c.webcamId}`, name: c.title, lat: c.location.latitude, lng: c.location.longitude, city: c.location.city, country: c.location.country, source: 'Windy.com', stream_url: c.player?.live || c.player?.day, stream_type: c.player?.live ? 'embed-live' : 'embed-timelapse', external_url: c.urls?.detail })) };
}

export function safeMediaUrl(value?: string) {
  if (!value) return undefined;
  if (value.startsWith('/')) return value;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; }
}
