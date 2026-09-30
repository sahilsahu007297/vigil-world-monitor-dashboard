import { useState } from 'react';
import type { GlobalCamera } from './services/global-feeds';

export default function CameraPanel({ cameras, status, onSelect }: { cameras: GlobalCamera[]; status: string; onSelect: (c: GlobalCamera) => void }) {
  const [query, setQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [limit, setLimit] = useState(100);
  const catalog = cameras;
  const countries = [...new Set(catalog.map(camera => camera.country).filter((value): value is string => Boolean(value)))].sort();
  const sources = [...new Set(catalog.map(camera => camera.source).filter((value): value is string => Boolean(value)))].sort();
  const filtered = catalog.filter(camera =>
    `${camera.name} ${camera.city} ${camera.country} ${camera.source}`.toLowerCase().includes(query.toLowerCase()) &&
    (!countryFilter || camera.country === countryFilter) &&
    (!sourceFilter || camera.source === sourceFilter),
  );
  return <div className="feed-explorer"><h3>Public camera explorer</h3><p>Browse every feed returned by connected public providers. Coverage depends on published provider availability.</p><input aria-label="Search cameras" value={query} onChange={e => { setQuery(e.target.value); setLimit(100); }} placeholder="Street, city, country or provider" />
    <div className="camera-filters"><select aria-label="Filter cameras by country" value={countryFilter} onChange={e => { setCountryFilter(e.target.value); setLimit(100); }}><option value="">All countries</option>{countries.map(value => <option key={value} value={value}>{value}</option>)}</select><select aria-label="Filter cameras by provider" value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setLimit(100); }}><option value="">All providers</option>{sources.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
    <p role="status">{status}</p><small>{filtered.length} matching cameras · click to view inside VIGIL</small>
    {filtered.slice(0, limit).map(camera => <button className="feed-result" key={`${camera.source}:${camera.id}`} onClick={() => onSelect(camera)}><strong>{camera.name}</strong><span>{camera.city || 'Location'} · {camera.country || 'Country unavailable'}</span><small>{camera.source} · {camera.stream_type === 'hls' ? 'Live video' : camera.stream_type === 'mp4' ? 'Recent video clip' : camera.stream_type?.replace('embed-', '') || 'Snapshot'}</small></button>)}{filtered.length > limit && <button className="feed-result" onClick={() => setLimit(value => value + 100)}>Show 100 more of {filtered.length.toLocaleString()}</button>}{filtered.length === 0 && <p>No published cameras match these filters. This does not imply there are no cameras at that location.</p>}</div>;
}
