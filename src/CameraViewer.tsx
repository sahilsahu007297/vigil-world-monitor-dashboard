import { useEffect, useState } from 'react';
import type { GlobalCamera } from './services/global-feeds';
import { safeMediaUrl } from './services/cameras';

export default function CameraViewer({ camera, onClose, onLocate }: { camera: GlobalCamera | null; onClose: () => void; onLocate?: (lat: number, lng: number) => void }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState(false);
  useEffect(() => { setError(false); setLoaded(false); setSnapshot(false); }, [camera?.id, camera?.feed_url]);
  useEffect(() => {
    if (camera?.source !== 'Transport for London' && camera?.source !== 'Fintraffic / Digitraffic') return;
    const timer = setInterval(() => { setRevision(x => x + 1); setLoaded(false); setError(false); }, camera.source === 'Transport for London' ? 120000 : 600000);
    return () => clearInterval(timer);
  }, [camera]);
  if (!camera) return null;
  const type = snapshot ? 'snapshot' : camera.stream_type || 'snapshot';
  const embed = type.startsWith('embed-');
  const raw = safeMediaUrl(type === 'snapshot' ? camera.feed_url : camera.stream_url);
  const url = raw && (camera.source === 'Transport for London' || camera.source === 'Fintraffic / Digitraffic') ? `${raw}${raw.includes('?') ? '&' : '?'}refresh=${revision}` : raw;
  const label = type === 'mp4' ? 'RECENT VIDEO CLIP' : type === 'embed-live' ? 'PROVIDER LIVE PLAYER' : embed ? 'TIMELAPSE' : 'SNAPSHOT';
  return <div className="camera-viewer-overlay"><section className="camera-viewer-content" role="dialog" aria-label="Public camera viewer"><div className="camera-header"><div><small>{camera.source}</small><h3>{camera.name}</h3><p>{camera.city} · {camera.country} · {camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}</p></div><button aria-label="Close camera" onClick={onClose}>×</button></div><div className="camera-viewport">
    {!url || error ? <div className="camera-status error"><p>Feed unavailable or playback restricted by the provider.</p><button onClick={() => { setError(false); setLoaded(false); setRevision(x => x + 1); }}>Retry</button></div> : embed ? <iframe key={`${url}-${revision}`} src={url} title={camera.name} allow="fullscreen; autoplay" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" /> : type === 'mp4' ? <video key={`${url}-${revision}`} src={url} controls muted playsInline onLoadedData={() => setLoaded(true)} onError={() => setError(true)} /> : <img key={`${url}-${revision}`} src={url} alt={camera.name} onLoad={() => setLoaded(true)} onError={() => setError(true)} />}
  </div><div className="camera-footer"><div><strong>{label}</strong><p>{embed ? 'Playback and availability controlled by provider' : error ? 'Unavailable' : loaded ? 'Media loaded' : 'Loading…'}</p><small>{camera.captured_at ? `Captured: ${new Date(camera.captured_at).toUTCString()}` : 'Capture time: see provider timestamp on image/video'}</small><p>Public feed · no recording by VIGIL</p></div><div>{camera.stream_type === 'mp4' && <button onClick={() => { setSnapshot(!snapshot); setError(false); setLoaded(false); }}>{snapshot ? 'Video clip' : 'Snapshot'}</button>}<button onClick={() => onLocate?.(camera.lat, camera.lng)}>Locate on map</button>{safeMediaUrl(camera.external_url) && <a href={safeMediaUrl(camera.external_url)} target="_blank" rel="noreferrer">Provider source ↗</a>}</div></div></section></div>;
}
