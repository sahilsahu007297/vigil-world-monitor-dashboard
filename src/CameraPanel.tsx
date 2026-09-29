import { useEffect, useState } from 'react';
import type { GlobalCamera } from './services/global-feeds';
import { windyCameras } from './services/cameras';

export default function CameraPanel({ cameras, status, onSelect }: { cameras: GlobalCamera[]; status: string; onSelect: (c: GlobalCamera) => void }) {
  const [query, setQuery] = useState('');
  const [key, setKey] = useState('');
  const [windyCountry, setWindyCountry] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [request, setRequest] = useState<{ key: string; country: string; offset: number } | null>(null);
  const [remote, setRemote] = useState<GlobalCamera[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    setBusy(true); setRemote([]); setTotal(0); setMessage('Loading worldwide webcams…');
    windyCameras(request.key, request.country, request.offset, controller.signal).then(data => { if (!controller.signal.aborted) { setRemote(data.cameras); setTotal(data.total); setMessage(`${data.total} webcams in provider coverage`); } }).catch(e => { if (!controller.signal.aborted) setMessage(e.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [request]);
  const catalog = [...cameras, ...remote];
  const countries = [...new Set(catalog.map(camera => camera.country).filter((value): value is string => Boolean(value)))].sort();
  const sources = [...new Set(catalog.map(camera => camera.source).filter((value): value is string => Boolean(value)))].sort();
  const filtered = catalog.filter(camera =>
    `${camera.name} ${camera.city} ${camera.country} ${camera.source}`.toLowerCase().includes(query.toLowerCase()) &&
    (!countryFilter || camera.country === countryFilter) &&
    (!sourceFilter || camera.source === sourceFilter),
  );
  return <div className="feed-explorer"><h3>Public camera explorer</h3><p>Browse every feed returned by connected public providers. Coverage depends on published provider availability.</p><input aria-label="Search cameras" value={query} onChange={e => setQuery(e.target.value)} placeholder="Street, city, country or provider" />
    <div className="camera-filters"><select aria-label="Filter cameras by country" value={countryFilter} onChange={e => setCountryFilter(e.target.value)}><option value="">All countries</option>{countries.map(value => <option key={value} value={value}>{value}</option>)}</select><select aria-label="Filter cameras by provider" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}><option value="">All providers</option>{sources.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
    <p role="status">{status}</p><small>{filtered.length} matching cameras · click to view inside VIGIL</small>
    <details open><summary>Worldwide webcams · optional Windy key</summary><p>Public traffic feeds work without a key. Windy adds worldwide discovery; the key stays in memory for this panel session.</p><form onSubmit={e => { e.preventDefault(); setRequest({ key, country: windyCountry, offset: 0 }); }}><input type="password" aria-label="Windy Webcams API key" autoComplete="off" value={key} onChange={e => setKey(e.target.value)} placeholder="Webcams API key" required /><input aria-label="Windy country code" value={windyCountry} onChange={e => setWindyCountry(e.target.value.toUpperCase())} maxLength={2} placeholder="Country code (optional)" /><button disabled={busy}>Load worldwide webcams</button></form><p role="status">{message}</p>{request && <div><button disabled={busy || request.offset === 0} onClick={() => setRequest({ ...request, offset: Math.max(0, request.offset - 50) })}>Previous</button><button disabled={busy || request.offset + 50 >= total || request.offset >= 1000} onClick={() => setRequest({ ...request, offset: request.offset + 50 })}>Next 50</button></div>}<a href="https://api.windy.com/webcams" target="_blank" rel="noreferrer">Webcams provided by Windy.com</a></details>
    {filtered.map(camera => <button className="feed-result" key={camera.id} onClick={() => onSelect(camera)}><strong>{camera.name}</strong><span>{camera.city || 'Location'} · {camera.country || 'Country unavailable'}</span><small>{camera.source} · {camera.stream_type === 'mp4' ? 'Recent video clip' : camera.stream_type?.replace('embed-', '') || 'Snapshot'}</small></button>)}{filtered.length === 0 && <p>No published cameras match these filters. This does not imply there are no cameras at that location.</p>}</div>;
}
