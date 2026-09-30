async function json(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json', 'User-Agent': 'VIGIL/1.0 (https://vigil-world-monitor-dashboard.vercel.app)' } });
  if (!response.ok) throw new Error(`Public feed returned ${response.status}`);
  return response.json() as Promise<any>;
}

export async function restoredPublicFeed(name: string) {
  if (name === 'gdelt') {
    const response = await fetch('https://www.gdacs.org/xml/rss.xml', { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`GDACS returned ${response.status}`);
    const xml = await response.text();
    const events = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].flatMap(([item]) => {
      const field = (tag: string) => (item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').trim();
      const lat = Number(field('geo:lat')), lng = Number(field('geo:long'));
      if (!field('geo:lat') || !field('geo:long') || !Number.isFinite(lat) || !Number.isFinite(lng) || field('gdacs:iscurrent') === 'false') return [];
      return [{ id: field('guid'), name: field('title'), lat, lng, url: field('link'), timestamp: field('pubDate') }];
    });
    return { events, source: 'GDACS / European Commission', timestamp: new Date().toISOString() };
  }
  if (name === 'cables') return json('https://www.submarinecablemap.com/api/v3/cable/cable-geo.json');
  if (name === 'maritime') {
    const data = await json('https://meri.digitraffic.fi/api/ais/v1/locations');
    if (!Array.isArray(data.features)) throw new Error('Invalid AIS response');
    const ships = data.features.filter((f: any) => Number.isFinite(f.geometry?.coordinates?.[0]) && Number.isFinite(f.geometry?.coordinates?.[1]) && Date.now() - f.properties?.timestampExternal < 3600000).map((f: any) => ({
      mmsi: f.properties.mmsi, name: `MMSI ${f.properties.mmsi}`, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1],
      timestamp: new Date(f.properties.timestampExternal).toISOString(),
    }));
    return { ships, total: ships.length, source: 'Fintraffic AIS · Baltic Sea coverage', timestamp: data.dataUpdatedTime };
  }
  if (name === 'flights') {
    const results = await Promise.allSettled([json('https://opensky-network.org/api/states/all'), json('https://api.adsb.lol/v2/mil')]);
    const data = results[0].status === 'fulfilled' ? results[0].value : null;
    const militaryData = results[1].status === 'fulfilled' ? results[1].value : null;
    if (!Array.isArray(data?.states) && !Array.isArray(militaryData?.ac)) throw new Error('Aircraft providers unavailable');
    const military = (militaryData?.ac || []).filter((a: any) => Number.isFinite(a.lat) && Number.isFinite(a.lon) && (a.seen_pos ?? 0) < 300).map((a: any) => ({
      icao24: a.hex, callsign: (a.flight || '').trim(), lng: a.lon, lat: a.lat, alt: a.alt_baro === 'ground' ? 0 : a.alt_baro * 0.3048,
      grounded: a.alt_baro === 'ground', speed_knots: a.gs, heading: a.track, squawk: a.squawk || '',
      model: a.desc || '', registration: a.r || '', airline_code: a.ownOp || '', aircraft_category: a.category || '',
      category: 'Military', type: a.t || '', observedAt: Date.now(), source: 'ADSB.lol', telemetry: a,
    }));
    const militaryIds = new Set(military.map((a: any) => a.icao24));
    const flights = (data?.states || []).filter((s: any[]) => !militaryIds.has(s[0]) && Number.isFinite(s[5]) && Number.isFinite(s[6]) && data.time - s[3] < 300).map((s: any[]) => ({
      icao24: s[0], callsign: (s[1] || '').trim(), lng: s[5], lat: s[6], alt: s[7], grounded: s[8],
      speed_knots: s[9] == null ? null : s[9] * 1.94384, heading: s[10], squawk: s[14] || '',
      model: '', registration: '', airline_code: '', aircraft_category: '', category: 'Civil / unclassified', type: '',
      observedAt: s[3] * 1000, source: 'OpenSky Network', telemetry: { seen_pos: data.time - s[3] },
    }));
    return { commercial_flights: flights, military_flights: military, total: flights.length + military.length, timestamp: new Date().toISOString(), source: 'OpenSky Network / ADSB.lol' };
  }
  throw new Error('Unsupported public feed');
}
