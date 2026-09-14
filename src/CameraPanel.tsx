import { useEffect, useState } from 'react';
import type { GlobalCamera } from './services/global-feeds';
import { windyCameras } from './services/cameras';

export default function CameraPanel({ cameras, status, onSelect }: { cameras: GlobalCamera[]; status: string; onSelect: (c: GlobalCamera) => void }) {
  const [query, setQuery] = useState('');
  const [key, setKey] = useState('');
  const [country, setCountry] = useState('');
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
  const filtered = [...cameras, ...remote].filter(c => `${c.name} ${c.city} ${c.country} ${c.source}`.toLowerCase().includes(query.toLowerCase()));
  const [limit, setLimit] = useState(50);
  return <div className="feed-explorer"><h3>Public camera explorer</h3><p>Published traffic cameras and opt-in webcams. Coverage is limited to participating providers.</p><input aria-label="Search cameras" value={query} onChange={e => { setQuery(e.target.value); setLimit(50); }} placeholder="Street, city, country or provider" /><p role="status">{status}</p><small>{filtered.length} matching cameras · click to view inside VIGIL</small>
    <details><summary>Worldwide webcams · optional Windy key</summary><p>Public traffic feeds work without a key. Windy adds worldwide discovery; the key stays in memory for this panel session.</p><form onSubmit={e => { e.preventDefault(); setRequest({ key, country, offset: 0 }); }}><input type="password" aria-label="Windy Webcams API key" autoComplete="off" value={key} onChange={e => setKey(e.target.value)} placeholder="Webcams API key" required /><input aria-label="Country code" value={country} onChange={e => setCountry(e.target.value.toUpperCase())} maxLength={2} placeholder="Country code (optional)" /><button disabled={busy}>Load worldwide webcams</button></form><p role="status">{message}</p>{request && <div><button disabled={busy || request.offset === 0} onClick={() => setRequest({ ...request, offset: Math.max(0, request.offset - 50) })}>Previous</button><button disabled={busy || request.offset + 50 >= total || request.offset >= 1000} onClick={() => setRequest({ ...request, offset: request.offset + 50 })}>Next 50</button></div>}<a href="https://api.windy.com/webcams" target="_blank" rel="noreferrer">Webcams provided by Windy.com</a></details>
    {filtered.slice(0, limit).map(c => <button className="feed-result" key={c.id} onClick={() => onSelect(c)}><strong>{c.name}</strong><span>{c.city} · {c.country}</span><small>{c.source} · {c.stream_type === 'mp4' ? 'Recent video clip' : c.stream_type?.replace('embed-', '') || 'Snapshot'}</small></button>)}{filtered.length > limit && <button onClick={() => setLimit(limit + 50)}>Show 50 more</button>}{filtered.length === 0 && <p>No published cameras match this search. This does not imply there are no cameras at that location.</p>}</div>;
}
