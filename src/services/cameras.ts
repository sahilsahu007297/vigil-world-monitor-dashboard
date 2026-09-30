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
      if (!Array.isArray(data.cameras)) throw new Error('Unexpected worldwide camera response');
      return data.cameras.map((camera): GlobalCamera => ({ ...camera, source: camera.source || 'Public CCTV aggregator' }));
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
  ]);
  const names = ['Worldwide public cameras', 'Singapore LTA', 'London TfL', 'Finland Digitraffic'];
  const cameras = feeds.flatMap(f => f.status === 'fulfilled' ? f.value : [])
    .filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng) && (safeMediaUrl(c.stream_url) || safeMediaUrl(c.feed_url)));
  const unique = [...new Map(cameras.map(camera => [`${cCameraKey(camera)}`, camera])).values()];
  const errors = feeds.flatMap((f, i) => f.status === 'rejected' ? [`${names[i]}: ${f.reason.message}`] : []);
  return { cameras: unique, errors };
}

function cCameraKey(camera: GlobalCamera) {
  return `${camera.source}:${camera.id}:${camera.lat}:${camera.lng}`;
}

export function safeMediaUrl(value?: string) {
  if (!value) return undefined;
  if (value.startsWith('/')) return value;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; }
}
