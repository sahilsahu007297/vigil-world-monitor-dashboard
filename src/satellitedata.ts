export type SatelliteType = "ISS" | "SPACE_STATION" | "WEATHER" | "COMMUNICATIONS" | "EARTH_OBSERVATION" | "NAVIGATION";

export type Satellite = {
  id: number;
  name: string;
  noradId: number;
  type: SatelliteType;
  country: string;
  lon: number;
  lat: number;
  altitude: number;
  velocity: number;
  visibility: "daylight" | "eclipsed" | "unknown";
  source: "Open Notify" | "CelesTrak sample" | "Curated orbital sample";
  focus: string;
  image: string;
};

export const satelliteTypes: SatelliteType[] = [
  "ISS",
  "SPACE_STATION",
  "WEATHER",
  "COMMUNICATIONS",
  "EARTH_OBSERVATION",
  "NAVIGATION",
];

export const satelliteTypeImages: Record<SatelliteType, string> = {
  ISS: "/satellites/iss.png",
  SPACE_STATION: "/satellites/tiangong.png",
  WEATHER: "/satellites/weather.png",
  COMMUNICATIONS: "/satellites/comms.png",
  EARTH_OBSERVATION: "/satellites/radar.png",
  NAVIGATION: "/satellites/nav.png",
};

const baseSatellites: Omit<Satellite, "lon" | "lat" | "visibility" | "source">[] = [
  { id: 25544, noradId: 25544, name: "ISS (ZARYA)", type: "ISS", country: "International", altitude: 420, velocity: 7.66, focus: "Crewed research platform and live Earth pass reference", image: "/satellites/iss.png" },
  { id: 48274, noradId: 48274, name: "Tiangong Space Station", type: "SPACE_STATION", country: "China", altitude: 390, velocity: 7.68, focus: "Crewed orbital station over Asia-Pacific corridors", image: "/satellites/tiangong.png" },
  { id: 43013, noradId: 43013, name: "NOAA-20", type: "WEATHER", country: "United States", altitude: 824, velocity: 7.45, focus: "Weather imaging and climate observations", image: "/satellites/noaa.png" },
  { id: 28654, noradId: 28654, name: "NOAA-18", type: "WEATHER", country: "United States", altitude: 854, velocity: 7.42, focus: "Polar weather monitoring", image: "/satellites/weather.png" },
  { id: 38908, noradId: 38908, name: "INSAT-3D", type: "WEATHER", country: "India", altitude: 35786, velocity: 3.07, focus: "Indian Ocean weather and storm monitoring", image: "/satellites/insat.png" },
  { id: 44878, noradId: 44878, name: "RISAT-2BR1", type: "EARTH_OBSERVATION", country: "India", altitude: 576, velocity: 7.58, focus: "Radar imaging for terrain, floods, agriculture, and security", image: "/satellites/risat.png" },
  { id: 25994, noradId: 25994, name: "OCEANSAT-2", type: "EARTH_OBSERVATION", country: "India", altitude: 720, velocity: 7.48, focus: "Ocean wind, maritime, and coastal observation", image: "/satellites/oceansat.png" },
  { id: 42969, noradId: 42969, name: "Cartosat-2 Series", type: "EARTH_OBSERVATION", country: "India", altitude: 505, velocity: 7.61, focus: "High-resolution mapping across India", image: "/satellites/cartosat.png" },
  { id: 40384, noradId: 40384, name: "GSAT-16", type: "COMMUNICATIONS", country: "India", altitude: 35786, velocity: 3.07, focus: "Broadcast and communications coverage for India", image: "/satellites/gsat.png" },
  { id: 43226, noradId: 43226, name: "IRNSS-1I", type: "NAVIGATION", country: "India", altitude: 35786, velocity: 3.07, focus: "NavIC regional navigation coverage", image: "/satellites/irnss.png" },
  { id: 44713, noradId: 44713, name: "Starlink-1007", type: "COMMUNICATIONS", country: "United States", altitude: 550, velocity: 7.55, focus: "Low Earth orbit broadband constellation", image: "/satellites/starlink.png" },
  { id: 37846, noradId: 37846, name: "Galileo-PFM", type: "NAVIGATION", country: "Europe", altitude: 23222, velocity: 3.87, focus: "European navigation timing and positioning", image: "/satellites/galileo.png" },
];

function orbitPosition(seed: number, altitude: number) {
  const now = Date.now() / 1000;
  const period = altitude > 30000 ? 86164 : 5400 + (seed % 900);
  const t = ((now + seed * 137) % period) / period;
  const lon = altitude > 30000 ? ((seed * 37) % 140) + 35 : t * 360 - 180;
  const inclination = altitude > 30000 ? 6 : 52 + (seed % 35);
  const lat = altitude > 30000 ? Math.sin(t * Math.PI * 2) * 2 : Math.sin(t * Math.PI * 2 + seed) * inclination;
  return { lon: ((lon + 540) % 360) - 180, lat: Math.max(-86, Math.min(86, lat)) };
}

export function generateSatelliteData(liveIss?: { lat: number; lon: number }): Satellite[] {
  return baseSatellites.map((sat, index) => {
    const isLiveIss = sat.noradId === 25544 && liveIss;
    const pos = isLiveIss ? { lat: liveIss.lat, lon: liveIss.lon } : orbitPosition(sat.noradId + index, sat.altitude);
    return {
      ...sat,
      ...pos,
      visibility: sat.altitude > 30000 ? "daylight" : index % 3 === 0 ? "eclipsed" : "unknown",
      source: isLiveIss ? "Open Notify" : sat.altitude > 30000 ? "Curated orbital sample" : "CelesTrak sample",
    };
  });
}

export const satelliteApiNotes = [
  "Open Notify: no-key ISS current latitude and longitude; poll about every 5 seconds.",
  "CelesTrak: public NORAD TLE catalogs for stations and satellite groups.",
  "N2YO: broad real-time positions and pass predictions, but requires a free API key.",
];
