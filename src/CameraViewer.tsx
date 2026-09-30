import { useEffect, useState } from 'react';
import type { GlobalCamera } from './services/global-feeds';
import { safeMediaUrl } from './services/cameras';
import HlsVideo from './HlsVideo';

export default function CameraViewer({ camera, onClose, onLocate, onStreetView }: { camera: GlobalCamera | null; onClose: () => void; onLocate?: (lat: number, lng: number) => void; onStreetView?: (lat: number, lng: number) => void }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState(false);
  useEffect(() => { setError(false); setLoaded(false); setSnapshot(false); }, [camera?.id, camera?.feed_url]);
  useEffect(() => {
    if (!camera || (camera.stream_type && camera.stream_type !== 'snapshot')) return;
    const delay = camera.source === 'Fintraffic / Digitraffic' ? 600000 : camera.source === 'Transport for London' ? 120000 : 60000;
    const timer = setInterval(() => { setRevision(x => x + 1); setLoaded(false); setError(false); }, delay);
    return () => clearInterval(timer);
  }, [camera]);
  if (!camera) return null;
  const type = snapshot ? 'snapshot' : camera.stream_type || 'snapshot';
  const embed = type.startsWith('embed-') || type === 'iframe';
  const raw = safeMediaUrl(type === 'snapshot' ? camera.feed_url || camera.stream_url : camera.stream_url || camera.feed_url);
  const url = raw && type === 'snapshot' ? `${raw}${raw.includes('?') ? '&' : '?'}refresh=${revision}` : raw;
  const label = type === 'hls' ? 'LIVE VIDEO STREAM' : type === 'mp4' ? 'RECENT VIDEO CLIP' : type === 'embed-live' || type === 'iframe' ? 'PROVIDER LIVE PLAYER' : embed ? 'TIMELAPSE' : 'REFRESHING SNAPSHOT';
  return <div className="camera-viewer-overlay"><section className="camera-viewer-content" role="dialog" aria-label="Public camera viewer"><div className="camera-header"><div><small>{camera.source}</small><h3>{camera.name}</h3><p>{camera.city} · {camera.country} · {camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}</p></div><button aria-label="Close camera" onClick={onClose}>×</button></div><div className="camera-viewport">
    {!url || error ? <div className="camera-status error"><p>Feed unavailable or playback restricted by the provider.</p><button onClick={() => { setError(false); setLoaded(false); setRevision(x => x + 1); }}>Retry</button></div> : embed ? <iframe key={`${url}-${revision}`} src={url} title={camera.name} allow="fullscreen; autoplay" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" /> : type === 'hls' ? <HlsVideo key={url} url={url} onLoad={() => setLoaded(true)} onError={() => setError(true)} /> : type === 'mp4' ? <video key={`${url}-${revision}`} src={url} controls muted playsInline onLoadedData={() => setLoaded(true)} onError={() => setError(true)} /> : <img key={`${url}-${revision}`} src={url} alt={camera.name} onLoad={() => setLoaded(true)} onError={() => setError(true)} />}
  </div><div className="camera-footer"><div><strong>{label}</strong><p>{embed ? 'Playback and availability controlled by provider' : error ? 'Unavailable' : loaded ? 'Media loaded' : 'Loading…'}</p><small>{camera.captured_at ? `Captured: ${new Date(camera.captured_at).toUTCString()}` : 'Capture time: see provider timestamp on image/video'}</small><p>Public feed · no recording by VIGIL</p></div><div>{camera.stream_type === 'mp4' && <button onClick={() => { setSnapshot(!snapshot); setError(false); setLoaded(false); }}>{snapshot ? 'Video clip' : 'Snapshot'}</button>}<button onClick={() => onLocate?.(camera.lat, camera.lng)}>Locate on map</button><button onClick={() => onStreetView?.(camera.lat, camera.lng)}>Street View</button>{safeMediaUrl(camera.external_url) && <a href={safeMediaUrl(camera.external_url)} target="_blank" rel="noreferrer">Provider source ↗</a>}</div></div></section></div>;
}
