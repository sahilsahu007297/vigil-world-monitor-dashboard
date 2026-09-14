import { useEffect, useState } from 'react';
import { hasPosition, searchAircraft, type SearchKind } from './services/airplanes';
import type { GlobalFlight } from './services/global-feeds';

export default function FlightPanel({ flights, status, onSelect, reportedCounts }: { flights: GlobalFlight[]; status: string; onSelect: (f: GlobalFlight) => void; reportedCounts?: { commercial: number; military: number; total: number } }) {
  const [kind, setKind] = useState<SearchKind>('callsign');
  const [query, setQuery] = useState('');
  const [request, setRequest] = useState<{ kind: SearchKind; query: string } | null>(null);
  const [results, setResults] = useState<GlobalFlight[] | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    setBusy(true); setMessage('Searching receiver coverage worldwide…'); setResults([]);
    Promise.resolve().then(() => searchAircraft(request.kind, request.query, controller.signal)).then(data => {
      if (controller.signal.aborted) return;
      setResults(data); setMessage(data.length ? `${data.length} aircraft found` : 'No aircraft currently reported with that exact identifier. Coverage is incomplete; try the ICAO callsign rather than the ticket flight number.');
    }).catch(e => { if (!controller.signal.aborted) setMessage(e.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [request]);
  const militaryCount = reportedCounts?.military ?? flights.filter(f => f.category === 'Military').length;
  const commercialCount = reportedCounts?.commercial ?? flights.length - militaryCount;
  const totalCount = reportedCounts?.total ?? flights.length;
  return <div className="feed-explorer">
    <h3>Flight search</h3><p>Airplanes.live + ADSB.lol fallback · worldwide lookup</p>
    <div className="flight-counts" aria-label="Current reported flight counts"><div><span>COMMERCIAL</span><strong>{commercialCount.toLocaleString()}</strong></div><div><span>MILITARY</span><strong>{militaryCount.toLocaleString()}</strong></div><div><span>TOTAL</span><strong>{totalCount.toLocaleString()}</strong></div></div>
    <form onSubmit={e => { e.preventDefault(); setRequest({ kind, query }); }}>
      <select aria-label="Flight identifier type" value={kind} onChange={e => setKind(e.target.value as SearchKind)}><option value="callsign">Callsign</option><option value="hex">ICAO hex</option><option value="reg">Registration</option><option value="type">Aircraft type</option></select>
      <input aria-label="Flight identifier" placeholder={kind === 'callsign' ? 'BAW117 / AIC101' : kind === 'hex' ? '4008F3' : kind === 'reg' ? 'G-XWBA' : 'A320'} value={query} onChange={e => setQuery(e.target.value)} required />
      <button disabled={busy} type="submit">{busy ? 'Searching…' : 'Search flights'}</button>
    </form>
    <p role="status">{results === null ? status : message}</p>
    {results !== null && <button onClick={() => { setRequest(null); setResults(null); }}>Return to map traffic</button>}
    <small>Map traffic: within 250 nautical miles of the map center. Pan to load another region. Missing aircraft are never simulated.</small>
    {(results ?? flights).map(f => <button className="feed-result" key={f.icao24} onClick={() => onSelect(f)}><strong>{f.callsign || f.registration || f.icao24}</strong><span>{f.type || 'Unknown type'} · {f.registration || f.icao24}</span><small>{hasPosition(f) ? `${f.lat.toFixed(2)}°, ${f.lng.toFixed(2)}°` : 'No recent position'} · Open dossier</small></button>)}
    <p><a href="https://github.com/xSNOWM4Nx/react-flight-tracker" target="_blank" rel="noreferrer">Map adapted from react-flight-tracker (MIT)</a></p>
  </div>;
}

export function AircraftDossier({ flight, onClose, onLocate }: { flight: GlobalFlight; onClose: () => void; onLocate: (f: GlobalFlight) => void }) {
  const [current, setCurrent] = useState(flight);
  const [status, setStatus] = useState('Refreshing aircraft…');
  const [photo, setPhoto] = useState<{ image: string; link?: string; photographer?: string } | null>(null);
  const [photoStatus, setPhotoStatus] = useState<'loading' | 'found' | 'missing'>('loading');
  useEffect(() => {
    const controller = new AbortController();
    setCurrent(flight);
    const refresh = async () => {
      try {
        const data = await searchAircraft('hex', flight.icao24, controller.signal);
        if (controller.signal.aborted) return;
        if (data[0]) { setCurrent(data[0]); setStatus(`${data[0].source} · refresh every 30 seconds`); }
        else setStatus('No longer reported. Showing last received telemetry.');
      } catch (e) { if (!controller.signal.aborted) setStatus((e as Error).message); }
    };
    refresh(); const timer = setInterval(refresh, 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [flight]);
  useEffect(() => {
    const controller = new AbortController();
    setPhoto(null); setPhotoStatus('loading');
    const loadPhoto = async () => {
      const identifiers = [["hex", current.icao24], ["reg", current.registration]].filter(([, value]) => Boolean(value)) as [string, string][];
      try {
        for (const [kind, value] of identifiers) {
          const endpoint = `/public-feeds/aircraft-photo/${kind}/${encodeURIComponent(value)}`;
          const response = await fetch(endpoint, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
          if (!response.ok) continue;
          const data = await response.json();
          const item = data?.photos?.[0];
          const image = item?.thumbnail_large || item?.thumbnail || item?.image;
          if (typeof image === 'string' && image.startsWith('http')) {
            if (!controller.signal.aborted) { setPhoto({ image, link: item.link, photographer: item.photographer }); setPhotoStatus('found'); }
            return;
          }
        }
        if (!controller.signal.aborted) setPhotoStatus('missing');
      } catch {
        if (!controller.signal.aborted) setPhotoStatus('missing');
      }
    };
    loadPhoto();
    return () => controller.abort();
  }, [current.icao24, current.registration]);
  const a = current.telemetry ?? {};
  const show = (v: unknown, unit = '') => v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v)) ? 'Not reported' : `${Array.isArray(v) ? v.join(', ') : v}${unit}`;
  const rows = [
    ['Callsign', current.callsign], ['Registration', current.registration], ['ICAO hex', current.icao24], ['Aircraft type', current.type], ['Description', current.model], ['Operator', current.airline_code],
    ['Classification', current.category], ['Emitter category', a.category], ['Barometric altitude', show(a.alt_baro, a.alt_baro === 'ground' ? '' : ' ft')], ['Geometric altitude', show(a.alt_geom, ' ft')],
    ['Ground speed', show(a.gs, ' kt')], ['True airspeed', show(a.tas, ' kt')], ['Track', show(a.track, '°')], ['Vertical rate', show(a.baro_rate, ' ft/min')], ['Squawk', current.squawk], ['Emergency', a.emergency],
    ['Position', hasPosition(current) ? `${current.lat.toFixed(5)}°, ${current.lng.toFixed(5)}°` : 'No recent position'], ['Position age at fetch', show(a.seen_pos, ' s')], ['Signal age at fetch', show(a.seen, ' s')],
    ['Selected altitude', show(a.nav_altitude_mcp, ' ft')], ['Navigation modes', show(a.nav_modes)], ['QNH', show(a.nav_qnh, ' hPa')], ['Receiver signal', show(a.rssi, ' dBFS')], ['Messages', a.messages], ['Position source', a.type], ['NIC / NACp / SIL', `${show(a.nic)} / ${show(a.nac_p)} / ${show(a.sil)}`],
  ];
  return <section className="point-dialog aircraft-detail" role="dialog" aria-label="Aircraft dossier"><header><div><p>{current.source || "ADS-B"} · AIRCRAFT DOSSIER</p><h2>{current.callsign || current.registration || current.icao24}</h2></div><button aria-label="Close aircraft dossier" onClick={onClose}>×</button></header><p role="status">{status}</p><p>Response time: {current.observedAt ? new Date(current.observedAt).toUTCString() : 'Unknown'}</p><div className="aircraft-photo">{photo ? <>{photo.link ? <a href={photo.link} target="_blank" rel="noreferrer"><img src={photo.image} alt={`Public photo of ${current.callsign || current.registration || current.icao24}`} /></a> : <img src={photo.image} alt={`Public photo of ${current.callsign || current.registration || current.icao24}`} />}<small>Public aircraft photo{photo.photographer ? ` · ${photo.photographer}` : ''} · PlaneSpotters</small></> : <div className="aircraft-photo-empty">{photoStatus === 'loading' ? 'Loading public aircraft image…' : <>No embedded photo returned. <a href={`https://globe.airplanes.live/?icao=${encodeURIComponent(current.icao24)}`} target="_blank" rel="noreferrer">Open Airplanes.live aircraft view</a></>}</div>}</div><div className="aircraft-dossier-grid">{rows.map(([label, value]) => <div key={String(label)}><span>{String(label)}</span><strong>{show(value)}</strong></div>)}</div><p>Routes, passenger details, and scheduled arrival times are not provided by this ADS-B feed.</p><button className="point-locate" disabled={!hasPosition(current)} onClick={() => onLocate(current)}>Locate reported position</button><a href={`https://globe.airplanes.live/?icao=${encodeURIComponent(current.icao24)}`} target="_blank" rel="noreferrer">View on Airplanes.live</a><p>Telemetry source: {current.source}. <a href="https://www.adsb.lol/docs/open-data/api/" target="_blank" rel="noreferrer">ADSB.lol data / ODbL 1.0</a></p></section>;
}
