import { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { GeoMarker } from "../Globe";

export function useRestoredLayers() {
  const [ships, setShips] = useState<GeoMarker[]>([]);
  const [naval, setNaval] = useState<GeoMarker[]>([]);
  const [incidents, setIncidents] = useState<GeoMarker[]>([]);
  const [cables, setCables] = useState<FeatureCollection | null>(null);
  const [status, setStatus] = useState<Record<string, "live" | "sample">>({});
  useEffect(() => {
    const controller = new AbortController();
    const mark = (key: string, live: boolean) => { if (!controller.signal.aborted) setStatus(s => ({ ...s, [key]: live ? "live" : "sample" })); };
    const json = async (name: string) => {
      const response = await fetch(`/public-feeds/osiris/${name}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(22000)]) });
      if (!response.ok) throw new Error(`Feed HTTP ${response.status}`);
      return response.json();
    };
    const update = async () => {
      await Promise.allSettled([
        json("maritime").then(data => {
          if (!Array.isArray(data.ships)) throw new Error("Invalid maritime response");
          if (controller.signal.aborted) return;
          const vessels: GeoMarker[] = [], military: GeoMarker[] = [];
          for (const ship of data.ships) {
            if (!Number.isFinite(ship.lat) || !Number.isFinite(ship.lng)) continue;
            const marker: GeoMarker = { lon: ship.lng, lat: ship.lat, kind: "vessel", label: ship.name || `MMSI ${ship.mmsi}`, detail: `Reported AIS position · MMSI ${ship.mmsi || "not reported"} · ${data.timestamp || "timestamp not reported"}` };
            if (ship.isMilitary === true || /^(military|naval)$/i.test(ship.category || ship.type || "")) military.push(marker);
            else vessels.push(marker);
          }
          setShips(vessels.slice(0, 400)); setNaval(military.slice(0, 100));
          mark("Vessels · AIS", true); mark("Naval vessels", true);
        }).catch(() => { if (!controller.signal.aborted) { setShips([]); setNaval([]); } mark("Vessels · AIS", false); mark("Naval vessels", false); }),
        json("gdelt").then(data => {
          if (!Array.isArray(data.events)) throw new Error("Invalid incidents response");
          if (controller.signal.aborted) return;
          setIncidents(data.events.filter((e: any) => Number.isFinite(e.lat) && Number.isFinite(e.lng) && /^https?:\/\//.test(e.url || "")).slice(0, 300).map((e: any): GeoMarker => ({ lon:e.lng, lat:e.lat, kind:"hazard", label:e.name || "Reported incident", detail:`${data.source || "Global incident feed"} · ${e.url}` })));
          mark("Global incidents", true);
        }).catch(() => { if (!controller.signal.aborted) setIncidents([]); mark("Global incidents", false); }),
      ]);
    };
    void update();
    json("cables").then(data => {
      if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) throw new Error("Invalid cable geography");
      if (!controller.signal.aborted) setCables(data);
      mark("Submarine cables", true);
    }).catch(() => mark("Submarine cables", false));
    const timer = window.setInterval(update, 120000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);
  return { ships, naval, incidents, cables, status };
}
