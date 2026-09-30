import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { KIND_COLOR, type GeoMarker } from "./Globe";
import NewsPanel from "./NewsPanel";
import { type NewsArticle } from "./newsdata";
import { fetchLiveNews, formatTimeAgo } from "./services/news";
import CameraViewer from "./CameraViewer";
import CameraPanel from "./CameraPanel";
import StreetViewModal from "./StreetViewModal";
import FlightPanel, { AircraftDossier } from "./FlightPanel";
import { hasPosition, isAircraftPosition, nearbyAircraft } from "./services/airplanes";
import { publicCameras } from "./services/cameras";
import { useRestoredLayers } from "./services/restored-layers";
import vigilLogo from "./Vigil-Logo-optimized.webp";
import { AlertTriangle, BarChart3, Bluetooth, CloudSun, Database, Eye, Layers, PencilLine, Radio, Radar, Search, SlidersHorizontal, TowerControl, Menu, X, Compass, Tv, Ship, Plane, Truck, Package, Settings, MapPin, Zap, Sparkles, Crosshair, Globe as GlobeIcon, type LucideIcon } from "lucide-react";
import {
  fetchEarthquakes,
  fetchConflicts,
  fetchCyberThreats,
  fetchNews as fetchGlobalNews,
  fetchFlights,
  POLL_INTERVALS,
  type GlobalCyberThreat,
  type GlobalNewsItem,
  type GlobalCamera,
  type FeedState,
  type GlobalSatellite,
  type GlobalFlight,
  fetchSatellites,
} from "./services/global-feeds";

type Layer = { label: string; count: string; active: boolean; kind: GeoMarker["kind"]; group: string };

const rightPanelOptions: [string, LucideIcon][] = [
  ["Signals", Radar],
  ["Live Now", Radio],
  ["Feed Brief", Sparkles],
  ["News", Tv],
  ["Cameras", Eye],
  ["Markets", BarChart3],
  ["Aviation", Plane],
  ["Chokepoints", Ship],
  ["Weather", CloudSun],
];

type WeatherSnapshot = { temperature: number; apparent: number; wind: number; weatherCode: number; timezone: string; place: string };

// Fixed geo hotspots (real coordinates) fused with live feeds below.
type EventMarker = GeoMarker & {
  updates?: { time: string; title: string; description: string }[];
  news?: { title: string; domain: string; time: string }[];
  timeline?: { date: string; event: string; severity: "critical" | "warning" | "info" }[];
  impact?: { category: string; value: string; icon: string }[];
  fullTitle?: string;
};

const conflictPoints: EventMarker[] = [
  { 
    lon: 34.8, lat: 31.5, kind: "conflict", label: "Israel", detail: "Active security signals · Level 4",
    fullTitle: "Israel-Palestine Border Escalation",
    updates: [
      { time: "02m ago", title: "Defense Ministry Alert", description: "Enhanced security posture maintained across northern regions following overnight activity reports." },
      { time: "1h ago", title: "Cross-Border Incident", description: "Two unconfirmed incidents reported near Gaza-Israel border. Official statements pending." },
      { time: "3h ago", title: "Regional Tensions Rise", description: "Neighboring countries increase diplomatic communications. Multiple simultaneous signals correlated." },
    ],
    news: [
      { title: "Israel heightens security alerts following increased border activity", domain: "Reuters", time: "45m" },
      { title: "Regional tensions escalate as military assets reposition", domain: "AP News", time: "1h" },
      { title: "Gaza humanitarian situation deteriorates amid new disruptions", domain: "Al Jazeera", time: "2h" },
    ],
    timeline: [
      { date: "-7D", event: "Initial diplomatic tensions", severity: "info" },
      { date: "-4D", event: "Military exercises announced", severity: "warning" },
      { date: "-2D", event: "Border security increased", severity: "warning" },
      { date: "Today", event: "Multiple cross-border signals detected", severity: "critical" },
    ],
    impact: [
      { category: "Regional Stability", value: "81", icon: "📊" },
      { category: "Trade Routes Affected", value: "3 major chokepoints", icon: "🚢" },
      { category: "Humanitarian Impact", value: "High", icon: "🏥" },
      { category: "Economic Loss", value: "$2.3B estimated daily", icon: "💰" },
    ]
  },
  { 
    lon: 30.5, lat: 50.4, kind: "conflict", label: "Ukraine", detail: "Sustained conflict events",
    fullTitle: "Ukraine Military Operations - Eastern Front",
    updates: [
      { time: "15m ago", title: "Artillery Exchange", description: "Significant weapons deployment detected across eastern front sectors. NATO monitoring intensifies." },
      { time: "45m ago", title: "Logistics Hub Hit", description: "Supply line disruption reported in Kharkiv region. Civilian casualties feared." },
      { time: "2h ago", title: "Air Defense Alert", description: "Multiple missile barrages intercepted. Infrastructure damage assessed." },
    ],
    news: [
      { title: "Ukraine reports major offensive push in Donbas region", domain: "BBC", time: "30m" },
      { title: "Russia claims territorial gains in latest update", domain: "TASS", time: "1h" },
      { title: "NATO allies increase weapons shipments amid escalation", domain: "DW News", time: "2h" },
    ],
    timeline: [
      { date: "-7D", event: "New mobilization reported", severity: "warning" },
      { date: "-3D", event: "Supply line interruptions", severity: "warning" },
      { date: "-1D", event: "Intelligence reports offensive prep", severity: "warning" },
      { date: "Today", event: "Major military operations underway", severity: "critical" },
    ],
    impact: [
      { category: "Military Personnel", value: "2,400+", icon: "⚔️" },
      { category: "Civilian Evacuation", value: "15,000", icon: "👥" },
      { category: "Infrastructure Damage", value: "$4.8B", icon: "🏢" },
      { category: "Energy Supply", value: "Critical threat", icon: "⚡" },
    ]
  },
  { 
    lon: 44.2, lat: 15.3, kind: "conflict", label: "Yemen", detail: "Maritime disruption · Bab el-Mandeb",
    fullTitle: "Red Sea Maritime Disruption",
    updates: [
      { time: "08m ago", title: "Vessel Alert", description: "Commercial cargo vessel reports suspicious activity. 21 AIS vessels in zone. Risk index: 82." },
      { time: "35m ago", title: "Chokepoint Disruption", description: "Bab el-Mandeb traffic reduced 12% as shipping diverts to longer routes." },
      { time: "1h ago", title: "Multiple Incident Reports", description: "4 cited sources confirm elevated risk signals. Insurance premiums rising." },
    ],
    news: [
      { title: "Red Sea transit risk rises after two verified incidents", domain: "Reuters", time: "15m" },
      { title: "Shipping companies reroute around disruption zones", domain: "Lloyd's List", time: "45m" },
      { title: "Maritime insurance costs surge due to renewed tensions", domain: "Bloomberg", time: "2h" },
    ],
    timeline: [
      { date: "-5D", event: "Initial warning signals", severity: "info" },
      { date: "-2D", event: "Risk assessment elevated", severity: "warning" },
      { date: "-1D", event: "Shipping deviations begin", severity: "warning" },
      { date: "Today", event: "Major transit disruption confirmed", severity: "critical" },
    ],
    impact: [
      { category: "Risk Index", value: "82/100", icon: "⚠️" },
      { category: "Affected Vessels", value: "21 AIS signals", icon: "🚢" },
      { category: "Trade Value Daily", value: "$340M", icon: "💼" },
      { category: "Transit Delay", value: "+48 hours avg", icon: "⏱️" },
    ]
  },
  { 
    lon: 121.0, lat: 23.7, kind: "conflict", label: "Taiwan", detail: "Elevated military air activity",
    fullTitle: "Taiwan Strait Air Activity Escalation",
    updates: [
      { time: "12m ago", title: "Air Defense Activation", description: "Taiwan air defense systems activated. Military confirming aircraft identification." },
      { time: "40m ago", title: "Military Drill Report", description: "Concurrent air exercises detected across strait. Civilian flights delayed." },
      { time: "1h ago", title: "Alert Status Raised", description: "Regional early warning systems fully activated. Press conferences scheduled." },
    ],
    news: [
      { title: "Taiwan scrambles jets amid elevated military activity", domain: "AFP", time: "25m" },
      { title: "Pentagon monitoring strait situation closely", domain: "CNN", time: "1h" },
      { title: "Commercial flights diverted as military exercises intensify", domain: "Aviation Herald", time: "2h" },
    ],
    timeline: [
      { date: "-6D", event: "Increased aircraft sorties", severity: "info" },
      { date: "-3D", event: "Military exercise announcement", severity: "warning" },
      { date: "-1D", event: "Air defense positioning", severity: "warning" },
      { date: "Today", event: "Active air operations in strait", severity: "critical" },
    ],
    impact: [
      { category: "Military Aircraft", value: "86+", icon: "✈️" },
      { category: "Airspace Closures", value: "5 zones", icon: "🛫" },
      { category: "Trade Disruption", value: "$25B potential", icon: "📦" },
      { category: "Regional Stability", value: "63", icon: "🌍" },
    ]
  },
  { 
    lon: 30.0, lat: 15.5, kind: "conflict", label: "Sudan", detail: "Displacement & clashes",
    fullTitle: "Sudan Humanitarian Crisis - Conflict Escalation",
    updates: [
      { time: "06m ago", title: "Displacement Alert", description: "Additional 50,000 civilians displaced. Humanitarian corridors established." },
      { time: "1h ago", title: "Aid Access Blocked", description: "Fighting blocks access to refugee camps. Medical supplies running critically low." },
      { time: "2h ago", title: "Clashes in Capital Region", description: "Armed groups clash near Khartoum. Civilian infrastructure damaged." },
    ],
    news: [
      { title: "Sudan conflict displaces another 50,000 civilians", domain: "UN OCHA", time: "45m" },
      { title: "Humanitarian crisis deepens as fighting intensifies", domain: "Human Rights Watch", time: "2h" },
      { title: "International aid efforts hampered by security concerns", domain: "IRC", time: "3h" },
    ],
    timeline: [
      { date: "-14D", event: "Initial conflict outbreak", severity: "critical" },
      { date: "-7D", event: "Displacement begins", severity: "critical" },
      { date: "-3D", event: "Humanitarian access limited", severity: "warning" },
      { date: "Today", event: "Full-scale escalation, mass displacement", severity: "critical" },
    ],
    impact: [
      { category: "Displaced People", value: "4.7M+", icon: "👥" },
      { category: "Food Insecurity", value: "18M at risk", icon: "🍞" },
      { category: "Disease Outbreak Risk", value: "Critical", icon: "🦠" },
      { category: "Economic Damage", value: "$8.2B", icon: "📉" },
    ]
  },
  { 
    lon: 96.1, lat: 21.0, kind: "conflict", label: "Myanmar", detail: "Regional instability",
    fullTitle: "Myanmar Civil Conflict - Regional Spillover",
    updates: [
      { time: "09m ago", title: "Border Clash", description: "Armed groups clash near Thailand border. Civilian traffic suspended." },
      { time: "55m ago", title: "Refugee Movement", description: "Cross-border refugee movement accelerates. Thailand prepares reception centers." },
      { time: "2h ago", title: "Military Repositioning", description: "Junta forces move to border regions. Regional tension rises." },
    ],
    news: [
      { title: "Myanmar civil conflict spreads to Thai border region", domain: "Bangkok Post", time: "1h" },
      { title: "Ethnic minorities report intensified military crackdown", domain: "Amnesty International", time: "2h" },
      { title: "ASEAN expresses concern over regional destabilization", domain: "DPA", time: "3h" },
    ],
    timeline: [
      { date: "-30D", event: "Initial civil unrest", severity: "warning" },
      { date: "-14D", event: "Military crackdown begins", severity: "warning" },
      { date: "-3D", event: "Border tensions rise", severity: "warning" },
      { date: "Today", event: "Regional spillover effects emerging", severity: "critical" },
    ],
    impact: [
      { category: "Refugees Generated", value: "100K+", icon: "🚶" },
      { category: "Regional Tension", value: "High", icon: "⚡" },
      { category: "Economic Impact", value: "$1.2B", icon: "💸" },
      { category: "Border Security", value: "Elevated alert", icon: "🚨" },
    ]
  },
];
const chokePoints: GeoMarker[] = [
  { lon: 43.3, lat: 12.6, kind: "vessel", label: "Bab el-Mandeb", detail: "Geographic reference · AIS feed not connected" },
  { lon: 56.3, lat: 26.6, kind: "vessel", label: "Strait of Hormuz", detail: "Geographic reference · AIS feed not connected" },
  { lon: 32.3, lat: 30.5, kind: "vessel", label: "Suez Canal", detail: "Geographic reference · AIS feed not connected" },
  { lon: -79.7, lat: 9.1, kind: "vessel", label: "Panama Canal", detail: "Geographic reference · AIS feed not connected" },
  { lon: 100.4, lat: 2.5, kind: "vessel", label: "Strait of Malacca", detail: "Geographic reference · AIS feed not connected" },
];
const infraPoints: GeoMarker[] = [
  { lon: -77.5, lat: 39.0, kind: "infra", label: "Ashburn DC cluster", detail: "AI datacenter corridor" },
  { lon: -6.2, lat: 53.3, kind: "infra", label: "Dublin DC cluster", detail: "AI datacenter corridor" },
  { lon: 103.8, lat: 1.35, kind: "infra", label: "Singapore landing", detail: "Submarine cable hub" },
];
const intelligencePoints: GeoMarker[] = [
  { lon: 77.2, lat: 28.6, kind: "conflict", label: "New Delhi hotspot", detail: "India political, economic, and security correlation" },
  { lon: 72.9, lat: 19.1, kind: "vessel", label: "Mumbai port", detail: "Strategic port and finance hub" },
  { lon: -77.0, lat: 38.9, kind: "conflict", label: "Washington sanctions desk", detail: "Sanctions and policy pressure center" },
  { lon: 37.6, lat: 55.7, kind: "conflict", label: "Moscow sanctions desk", detail: "Energy, defence, and sanctions exposure" },
  { lon: 116.4, lat: 39.9, kind: "conflict", label: "Beijing hotspot", detail: "Regional posture and trade policy signals" },
  { lon: -75.7, lat: 45.4, kind: "hazard", label: "Canada alerts", detail: "Weather, wildfire, and public alert focus" },
];
const strategicPoints: GeoMarker[] = [
  { lon: 77.7, lat: 13.7, kind: "base", label: "ISRO Sriharikota", detail: "Spaceport · India launch corridor" },
  { lon: -80.6, lat: 28.5, kind: "base", label: "Cape Canaveral", detail: "Spaceport · US launch corridor" },
  { lon: 55.5, lat: 25.2, kind: "infra", label: "Jebel Ali", detail: "Trade route and energy logistics hub" },
  { lon: 82.7, lat: 24.9, kind: "infra", label: "India coal belt", detail: "Critical mineral and energy exposure" },
  { lon: 14.4, lat: 50.1, kind: "hazard", label: "Temelin nuclear zone", detail: "Nuclear infrastructure marker" },
  { lon: 77.6, lat: 12.9, kind: "hazard", label: "Kaiga nuclear corridor", detail: "India nuclear infrastructure marker" },
];
const infrastructurePoints: GeoMarker[] = [
  { lon: 90, lat: 23, kind: "cable", label: "Bay of Bengal cable", detail: "Undersea cable and landing exposure" },
  { lon: 44, lat: 31, kind: "infra", label: "Middle East pipelines", detail: "Oil and gas pipeline corridor" },
  { lon: -0.1, lat: 51.5, kind: "infra", label: "London markets", detail: "Economic center and exchange exposure" },
  { lon: 139.7, lat: 35.7, kind: "infra", label: "Tokyo markets", detail: "Economic center and supply-chain signal" },
  { lon: 103.8, lat: 1.3, kind: "infra", label: "SEA internet hub", detail: "Cloud, cable, and outage watch" },
];
const referenceLayers: Record<string, GeoMarker[]> = {
  "Intelligence hotspots": intelligencePoints,
  "Nuclear facilities": strategicPoints.filter(point => point.label.includes("nuclear") || point.label.includes("Temelin")),
  "Spaceports": strategicPoints.filter(point => point.kind === "base"),
  "Critical minerals": strategicPoints.filter(point => point.label.includes("coal")),
  "AI datacenters": infraPoints.filter(point => point.label.includes("DC cluster")),
  "Pipelines": infrastructurePoints.filter(point => point.label.includes("pipeline")),
  "Economic centers": infrastructurePoints.filter(point => point.label.includes("markets")),
  "Trade routes": chokePoints,
};
const initialLayers: Layer[] = [
  { label: "Conflict events", count: "—", active: true, kind: "conflict", group: "CONFLICT & SECURITY" },
  { label: "Global incidents", count: "—", active: true, kind: "hazard", group: "CONFLICT & SECURITY" },
  { label: "Intelligence hotspots", count: "—", active: false, kind: "conflict", group: "CONFLICT & SECURITY" },
  { label: "Protest clusters", count: "—", active: false, kind: "conflict", group: "CONFLICT & SECURITY" },
  { label: "Sanctions pressure", count: "—", active: false, kind: "conflict", group: "CONFLICT & SECURITY" },
  { label: "Military bases", count: "—", active: false, kind: "base", group: "STRATEGIC ASSETS" },
  { label: "Nuclear facilities", count: "—", active: false, kind: "hazard", group: "STRATEGIC ASSETS" },
  { label: "Spaceports", count: "—", active: false, kind: "base", group: "STRATEGIC ASSETS" },
  { label: "Satellites · TLE", count: "—", active: true, kind: "infra", group: "STRATEGIC ASSETS" },
  { label: "Critical minerals", count: "—", active: false, kind: "infra", group: "STRATEGIC ASSETS" },
  { label: "AI datacenters", count: "—", active: false, kind: "infra", group: "STRATEGIC ASSETS" },
  { label: "Pipelines", count: "—", active: false, kind: "infra", group: "INFRASTRUCTURE" },
  { label: "Internet outages", count: "—", active: false, kind: "infra", group: "INFRASTRUCTURE" },
  { label: "Economic centers", count: "—", active: false, kind: "infra", group: "INFRASTRUCTURE" },
  { label: "Military flights", count: "—", active: true, kind: "flight", group: "AVIATION" },
  { label: "Commercial flights", count: "—", active: true, kind: "flight", group: "AVIATION" },
  { label: "GPS jamming zones", count: "—", active: false, kind: "hazard", group: "AVIATION" },
  { label: "Waterways", count: "—", active: true, kind: "vessel", group: "MARITIME" },
  { label: "Vessels · AIS", count: "—", active: true, kind: "vessel", group: "MARITIME" },
  { label: "Naval vessels", count: "—", active: true, kind: "vessel", group: "MARITIME" },
  { label: "Dark ships", count: "—", active: false, kind: "vessel", group: "MARITIME" },
  { label: "Trade routes", count: "—", active: false, kind: "vessel", group: "MARITIME" },
  { label: "Submarine cables", count: "—", active: false, kind: "cable", group: "INFRASTRUCTURE" },
  { label: "Day / night", count: "3D", active: false, kind: "infra", group: "CLIMATE & HAZARDS" },
  { label: "Earthquakes · USGS", count: "—", active: true, kind: "hazard", group: "CLIMATE & HAZARDS" },
  { label: "Wildfires · EONET", count: "—", active: true, kind: "hazard", group: "CLIMATE & HAZARDS" },
  { label: "Weather alerts", count: "—", active: true, kind: "hazard", group: "CLIMATE & HAZARDS" },
  { label: "Canada alerts", count: "—", active: false, kind: "hazard", group: "CLIMATE & HAZARDS" },
  { label: "Camera feeds", count: "—", active: true, kind: "infra", group: "INFRASTRUCTURE" },
  { label: "Cell towers · OpenCellID", count: "—", active: false, kind: "infra", group: "INFRASTRUCTURE" },
];
const layerGroups = ["CONFLICT & SECURITY", "STRATEGIC ASSETS", "INFRASTRUCTURE", "AVIATION", "MARITIME", "CLIMATE & HAZARDS"];

const countries = [["IL", "Israel", 81, "▲"], ["YE", "Yemen", 78, "▲"], ["UA", "Ukraine", 75, "─"], ["TW", "Taiwan", 63, "▲"], ["VE", "Venezuela", 54, "▼"]];
const openSources = [
  ["Global Proxy", "OSINT proxy — earthquakes, conflicts, cyber threats, flights, news"],
  ["GDELT", "news, sanctions, hotspots, outages, trade, pipelines"],
  ["ReliefWeb", "humanitarian reports and crisis intelligence"],
  ["USGS", "earthquakes and seismic hazards (via Global Proxy)"],
  ["NASA EONET", "wildfires and natural event tracking"],
  ["NWS", "free public severe weather alerts"],
  ["OpenSky", "open aircraft state vectors"],
  ["CISA KEV", "active exploited vulnerability alerts (via Global Proxy)"],
  ["Open Notify", "live ISS position"],
];

function Spark({ up = true }: { up?: boolean }) { return <svg className="spark" viewBox="0 0 66 20"><path d={up ? "M1 15L10 13L18 15L28 8L37 11L47 5L56 7L65 2" : "M1 4L10 6L18 4L28 12L37 9L47 15L56 12L65 18"} /></svg>; }

function MarketChart({ positive }: { positive: boolean }) {
  return <svg className="market-chart" viewBox="0 0 280 72" role="img" aria-label="Indicative market trend chart"><path className="chart-grid" d="M0 18H280M0 36H280M0 54H280" /><path className={positive ? "chart-line positive" : "chart-line negative"} d={positive ? "M0 55L24 48L48 52L72 37L96 41L120 29L144 34L168 19L192 25L216 12L240 18L280 6" : "M0 15L24 22L48 18L72 34L96 29L120 42L144 38L168 51L192 43L216 59L240 54L280 67"} /></svg>;
}

function WeatherPanel({ snapshot, state }: { snapshot: WeatherSnapshot | null; state: "idle" | "loading" | "live" | "error" }) {
  return <div className="weather-panel"><div className="section-head"><span>LOCAL WEATHER</span><small className={state === "live" ? "feed live" : "feed sample"}>{state === "live" ? "OPEN-METEO LIVE" : state.toUpperCase()}</small></div>{snapshot ? <><div className="weather-hero"><div><strong>{Math.round(snapshot.temperature)}°C</strong><span>{weatherLabel(snapshot.weatherCode)}</span></div><b>⌖ {snapshot.place}</b></div><div className="weather-grid"><div><span>FEELS LIKE</span><strong>{Math.round(snapshot.apparent)}°C</strong></div><div><span>WIND</span><strong>{Math.round(snapshot.wind)} km/h</strong></div><div><span>TIMEZONE</span><strong>{snapshot.timezone}</strong></div><div><span>DATA SOURCE</span><strong>Open-Meteo</strong></div></div></> : <p className="news-empty">{state === "error" ? "Weather data is unavailable for this location." : "Loading current weather..."}</p>}</div>;
}

function weatherLabel(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog / low visibility";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  return "Thunderstorm";
}

export default function App() {
  useEffect(() => { window.localStorage.removeItem("vigil_powerup_keys"); }, []);
  const [launched, setLaunched] = useState(true);
  const [streetViewTarget, setStreetViewTarget] = useState<[number, number] | null>(null);
  const [streetViewMode, setStreetViewMode] = useState(false);
  const [activeNav, setActiveNav] = useState<"BRIEF" | "UNIT MAP" | "SETUP" | "VELOX AERO">("UNIT MAP");
  const [filterMode, setFilterMode] = useState<"City" | "District" | "Street">("City");
  const [showLayersPanel, setShowLayersPanel] = useState(() => window.innerWidth > 850);
  const [layers, setLayers] = useState(initialLayers);
  const restored = useRestoredLayers();
  const [tab, setTab] = useState("Cameras");
  const [rightPanelOpen, setRightPanelOpen] = useState(() => window.innerWidth > 1050);
  const [lens, setLens] = useState("World");
  const [selectedPoint, setSelectedPoint] = useState<{ marker: GeoMarker; satellite?: GlobalSatellite } | null>(null);
  const [command, setCommand] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [zoom, setZoom] = useState(1);
  const [showEarthquakeCard, setShowEarthquakeCard] = useState(false);
  const [is3dGlobe, setIs3dGlobe] = useState(true);
  const [mapTarget, setMapTarget] = useState<[number, number] | undefined>(undefined);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "live" | "denied">("idle");
  const locationWatchRef = useRef<number | null>(null);
  const [earthquakes, setEarthquakes] = useState(0);
  const [quakeMarkers, setQuakeMarkers] = useState<GeoMarker[]>([]);
  const [flightMarkers, setFlightMarkers] = useState<GeoMarker[]>([]);
  const [commercialFlightMarkers, setCommercialFlightMarkers] = useState<GeoMarker[]>([]);
  const [aircraft, setAircraft] = useState<GlobalFlight[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState<GlobalFlight | null>(null);
  const [flightStatus, setFlightStatus] = useState("Loading regional aircraft…");
  const [cameraStatus, setCameraStatus] = useState("Loading public camera providers…");
  const [flightCenter, setFlightCenter] = useState<[number, number]>([77.2, 28.6]);
  const [flightCount, setFlightCount] = useState<number | null>(null);
  const [militaryFlightCount, setMilitaryFlightCount] = useState<number | null>(null);
  const [commercialFlightCount, setCommercialFlightCount] = useState<number | null>(null);
  const [reportedFlightCounts, setReportedFlightCounts] = useState<{ commercial: number; military: number; total: number } | undefined>(undefined);
  const [fireMarkers, setFireMarkers] = useState<GeoMarker[]>([]);
  const [fireCount, setFireCount] = useState<number | null>(null);
  const [weatherMarkers, setWeatherMarkers] = useState<GeoMarker[]>([]);
  const [weatherCount, setWeatherCount] = useState<number | null>(null);
  const [satellites, setSatellites] = useState<GlobalSatellite[]>([]);
  const [satelliteCount, setSatelliteCount] = useState<number | null>(null);
  const [feedStatus, setFeedStatus] = useState<Record<string, "live" | "sample">>({
    "Conflict events": "sample", "Satellites · TLE": "sample",
    "Military flights": "sample", "Commercial flights": "sample", "Waterways": "sample",
    "Earthquakes · USGS": "sample", "Wildfires · EONET": "sample", "Weather alerts": "sample", "Camera feeds": "sample",
  });
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsState, setNewsState] = useState<"loading" | "ok" | "sample">("loading");
  const [liveNowItems, setLiveNowItems] = useState<GlobalNewsItem[]>([]);
  const [liveNowState, setLiveNowState] = useState<"loading" | "live" | "stale">("loading");
  const [liveNewsSearch, setLiveNewsSearch] = useState("");
  const [liveNewsCountry, setLiveNewsCountry] = useState("WORLD");
  const [showLiveMapFeed, setShowLiveMapFeed] = useState(true);
  const [newsSearch, setNewsSearch] = useState("");
  const [channel, setChannel] = useState(0);
  const [marketRows, setMarketRows] = useState<string[][]>([]);
  const [marketQuery, setMarketQuery] = useState("");
  const [marketNews, setMarketNews] = useState<{ title: string; url: string; domain: string; time: string; imageUrl?: string }[]>([]);
  const [marketNewsState, setMarketNewsState] = useState<"idle" | "loading" | "ok" | "empty">("idle");
  const [weatherSnapshot, setWeatherSnapshot] = useState<WeatherSnapshot | null>(null);
  const [weatherState, setWeatherState] = useState<"idle" | "loading" | "live" | "error">("idle");
  const [showNewsPanel, setShowNewsPanel] = useState(false);
  const [showSatelliteViewer, setShowSatelliteViewer] = useState(false);
  const [globalConflictMarkers, setGlobalConflictMarkers] = useState<GeoMarker[]>([]);
  const [cyberThreats, setCyberThreats] = useState<GlobalCyberThreat[]>([]);
  const [cyberThreatLevel, setCyberThreatLevel] = useState<string>("—");
  const [globalNewsItems, setGlobalNewsItems] = useState<GlobalNewsItem[]>([]);
  const [globalCameras, setGlobalCameras] = useState<GlobalCamera[]>([]);
  const [cameraMarkers, setCameraMarkers] = useState<GeoMarker[]>([]);
  const [activeCamera, setActiveCamera] = useState<GlobalCamera | null>(null);
  const mark = (k: string, s: "live" | "sample") => setFeedStatus(p => (p[k] === s ? p : { ...p, [k]: s }));

  const weatherTarget = mapTarget || myLocation || [77.5946, 12.9716];
  useEffect(() => {
    let active = true;
    setWeatherState("loading");
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${weatherTarget[1]}&longitude=${weatherTarget[0]}&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto`)
      .then(response => response.json())
      .then(data => {
        if (!active || !data?.current) return;
        setWeatherSnapshot({ temperature: data.current.temperature_2m, apparent: data.current.apparent_temperature, wind: data.current.wind_speed_10m, weatherCode: data.current.weather_code, timezone: data.timezone, place: `${weatherTarget[1].toFixed(2)}°, ${weatherTarget[0].toFixed(2)}°` });
        setWeatherState("live");
      })
      .catch(() => { if (active) setWeatherState("error"); });
    return () => { active = false; };
  }, [weatherTarget[0], weatherTarget[1]]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => () => {
    if (locationWatchRef.current != null) navigator.geolocation?.clearWatch(locationWatchRef.current);
  }, []);

  useEffect(() => {
    if (lens === "Finance") setChannel(3);
    else if (lens === "Tech") setChannel(2);
    else if (lens === "Commodity") setChannel(1);
    else if (lens === "Energy") setChannel(4);
    else setChannel(0);

    setLayers(() => {
      if (lens === "World") return initialLayers;

      const mapping: Record<string, string[]> = {
        Tech: ["Satellites · TLE", "Camera feeds", "Commercial flights"],
        Finance: ["Conflict events", "Commercial flights", "Waterways"],
        Commodity: ["Waterways", "Wildfires · EONET", "Earthquakes · USGS"],
        Energy: ["Waterways", "Wildfires · EONET", "Earthquakes · USGS", "Conflict events"],
        Calm: ["Wildfires · EONET", "Earthquakes · USGS", "Weather alerts"]
      };

      const enabled = mapping[lens] || [];
      return initialLayers.map(l => ({ ...l, active: enabled.includes(l.label) }));
    });
  }, [lens]);

  useEffect(() => { const i = setInterval(() => setClock(new Date()), 1000); const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCommand(true); } }; window.addEventListener("keydown", key); return () => { clearInterval(i); window.removeEventListener("keydown", key); }; }, []);
  useEffect(() => {
    let live = true;
    const updateSignals = async () => {
      try {
        // Earthquakes from the official USGS daily GeoJSON feed.
        const quakeResult = fetchEarthquakes().then(({ data, state }) => {
          if (!live) return;
          if (state !== "live") {
            setQuakeMarkers([]);
            mark("Earthquakes · USGS", "sample");
            return;
          }
          setEarthquakes(data.total);
          mark("Earthquakes · USGS", "live");
          setQuakeMarkers(
            data.earthquakes
              .filter(q => q.magnitude >= 2.5)
              .slice(0, 120)
              .map(q => ({
                lon: q.lng,
                lat: q.lat,
                kind: "hazard" as const,
                mag: q.magnitude,
                label: q.place || "Seismic event",
                detail: `M${q.magnitude.toFixed(1)} · D${q.depth}km · USGS · ${new Date(q.time).toISOString().slice(11, 16)} UTC`,
              })),
          );
        }).catch(() => { if (live) { setQuakeMarkers([]); mark("Earthquakes · USGS", "sample"); } });

        // BTC market price (kept as direct call — not proxied by Global)
        const btcResult = fetch("/public-feeds/bitcoin")
          .then(r => { if (!r.ok) throw new Error(`CoinGecko ${r.status}`); return r.json(); })
          .then(coinData => {
            if (!live) return;
            const btc = coinData.bitcoin;
            if (Number.isFinite(btc?.usd)) setMarketRows([["BTC / USD", "COINGECKO", Math.round(btc.usd).toLocaleString(), `${btc.usd_24h_change >= 0 ? "+" : ""}${Number(btc.usd_24h_change || 0).toFixed(2)}%`, btc.usd_24h_change >= 0 ? "up" : "down"]]);
          }).catch(() => { if (live) setMarketRows([]); });

        await Promise.allSettled([quakeResult, btcResult]);
      } catch { /* Feeds show unavailable; no sample observations. */ }
    };
    updateSignals();
    const interval = window.setInterval(updateSignals, POLL_INTERVALS.earthquakes * 1000);
    return () => { live = false; window.clearInterval(interval); };
  }, []);

  // ── Global: Conflicts ──
  useEffect(() => {
    let live = true;
    const loadConflicts = async () => {
      try {
        const { data, state } = await fetchConflicts();
        if (!live) return;
        if (state !== "live") { setGlobalConflictMarkers([]); mark("Conflict events", "sample"); return; }
        mark("Conflict events", "live");
        // Map conflict zones + live events to GeoMarkers
        const markers: GeoMarker[] = [];
        for (const zone of data.zones) {
          for (const ev of zone.events.slice(0, 3)) {
            if (!ev.url || !Number.isFinite(ev.lng) || !Number.isFinite(ev.lat)) continue;
            markers.push({
              lon: ev.lng, lat: ev.lat, kind: "conflict",
              label: ev.title.slice(0, 50),
              detail: `${zone.label} · Published report, approximate map location · ${ev.url}`,
            });
          }
        }
        setGlobalConflictMarkers(markers);
      } catch { if (live) { setGlobalConflictMarkers([]); mark("Conflict events", "sample"); } }
    };
    loadConflicts();
    const interval = window.setInterval(loadConflicts, POLL_INTERVALS.conflicts * 1000);
    return () => { live = false; window.clearInterval(interval); };
  }, []);

  // ── Global: Cyber Threats ──
  useEffect(() => {
    let live = true;
    const loadCyber = async () => {
      try {
        const { data } = await fetchCyberThreats();
        if (!live) return;
        setCyberThreats(data.threats);
        setCyberThreatLevel(data.stats.threat_level);
      } catch { /* retain previous state */ }
    };
    loadCyber();
    const interval = window.setInterval(loadCyber, POLL_INTERVALS.cyberThreats * 1000);
    return () => { live = false; window.clearInterval(interval); };
  }, []);

  // ── Global: Satellites ──
  useEffect(() => {
    let live = true;
    const loadSatellites = async () => {
      try {
        const { data, state } = await fetchSatellites();
        if (!live) return;
        if (state !== "live") { setSatellites([]); setSatelliteCount(0); mark("Satellites · TLE", "sample"); return; }
        setSatellites(data.satellites);
        setSatelliteCount(data.total);
        mark("Satellites · TLE", "live");
      } catch { if (live) { setSatellites([]); setSatelliteCount(0); mark("Satellites · TLE", "sample"); } }
    };
    loadSatellites();
    const interval = window.setInterval(loadSatellites, POLL_INTERVALS.satellites * 1000);
    return () => { live = false; window.clearInterval(interval); };
  }, []);

  // ── Global: Cameras ──
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const loadCameras = async () => {
      const result = await publicCameras(controller.signal);
      if (!live) return;
      setGlobalCameras(result.cameras);
      setCameraMarkers(result.cameras.map(c => ({ lon: c.lng, lat: c.lat, kind: "infra", cameraId: c.id, label: c.name, detail: `${c.source} · ${c.stream_type || "snapshot"} · published camera` })));
      setCameraStatus(`${result.cameras.length} published cameras. ${result.errors.join(' · ')}`);
      mark("Camera feeds", result.cameras.length ? "live" : "sample");
      setActiveCamera(current => current ? result.cameras.find(c => c.id === current.id) ?? current : null);
    };
    const refreshCameras = () => { void loadCameras().catch(() => { if (live) setCameraStatus('Camera providers unavailable. Retrying automatically.'); }); };
    refreshCameras();
    const interval = window.setInterval(refreshCameras, 120000);
    return () => { live = false; controller.abort(); window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const loadFlights = async () => {
      try {
        let data;
        try {
          data = (await fetchFlights(controller.signal)).data;
        } catch (error) {
          const fallback = await nearbyAircraft(flightCenter[1], flightCenter[0], controller.signal);
          if (!fallback.length) throw error;
          data = { commercial_flights: fallback.filter(flight => flight.category !== "Military"), military_flights: fallback.filter(flight => flight.category === "Military"), source: "ADSB regional fallback" };
        }
        if (!live) return;
        const normalize = (flight: GlobalFlight, category: string): GlobalFlight => ({
          ...flight,
          category: category.toLowerCase() === "military" ? "Military" : category,
          source: data.source || "Global flight API",
          observedAt: flight.observedAt || (data.timestamp ? Date.parse(data.timestamp) : undefined),
          telemetry: flight.telemetry || {},
        });
        const flights = [
          ...(data.military_flights || []).map(flight => normalize(flight, "military")),
          ...(data.commercial_flights || []).map(flight => normalize(flight, flight.category || "commercial")),
          ...(data.private_flights || []).map(flight => normalize(flight, flight.category || "private")),
        ];
        if (!flights.length) {
          flights.push(...await nearbyAircraft(flightCenter[1], flightCenter[0], controller.signal));
        }
        const withCoordinates = flights.filter(isAircraftPosition);
        const military = flights.filter(f => f.category === "Military");
        const commercial = flights.filter(f => f.category !== "Military");
        const totalReported = typeof data.total === "number" ? data.total : flights.length;
        const militaryReported = typeof data.military_flights?.length === "number" ? data.military_flights.length : military.length;
        const commercialReported = typeof data.commercial_flights?.length === "number" ? data.commercial_flights.length + (data.private_flights?.length || 0) : commercial.length;
        const marker = (flight: GlobalFlight): GeoMarker => ({ lon: flight.lng, lat: flight.lat, kind: "flight", label: flight.callsign || flight.icao24, heading: flight.heading, flight });
        setAircraft(flights);
        setFlightCount(withCoordinates.length);
        setMilitaryFlightCount(military.length);
        setCommercialFlightCount(commercial.length);
        setReportedFlightCounts({ commercial: Math.max(commercialReported, totalReported - militaryReported), military: militaryReported, total: Math.max(totalReported, commercialReported + militaryReported) });
        setFlightMarkers(withCoordinates.filter(f => f.category === "Military").map(marker));
        setCommercialFlightMarkers(withCoordinates.filter(f => f.category !== "Military").map(marker));
        setFlightStatus(`${data.source || 'Aircraft feed'} · ${withCoordinates.length || totalReported} reported aircraft · received ${new Date().toLocaleTimeString()}`);
        mark("Military flights", "live"); mark("Commercial flights", "live");
      } catch (e) {
        if (!live) return;
        setAircraft([]);
        setFlightMarkers([]);
        setCommercialFlightMarkers([]);
        setFlightCount(0);
        setMilitaryFlightCount(0);
        setCommercialFlightCount(0);
        setReportedFlightCounts(undefined);
        setFlightStatus(`${(e as Error).message} · aircraft feed unavailable`);
        mark("Military flights", "sample"); mark("Commercial flights", "sample");
      }
    };
    const initial = window.setTimeout(loadFlights, 500);
    const interval = window.setInterval(loadFlights, 30000);
    return () => { live = false; controller.abort(); window.clearTimeout(initial); window.clearInterval(interval); };
  }, [flightCenter]);

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const loadLiveNow = async () => {
      if (live) setLiveNowState(current => current === "live" ? current : "loading");
      try {
        const country = liveNewsCountry === "WORLD" ? "" : ` ${liveNewsCountry}`;
        const topic = liveNewsSearch.trim() || "latest world news";
        const response = await fetch(`/public-feeds/news?q=${encodeURIComponent(`${topic}${country}`)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
        if (!response.ok) throw new Error(`News providers returned ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload?.articles) || payload.articles.length === 0) throw new Error("News providers returned no article list");
        const data: GlobalNewsItem[] = payload.articles.map((article: any, index: number) => ({
          id: article.id || article.link || `news-live-${index}`,
          title: article.title || "Untitled report",
          description: article.description || "Live report from a monitored news publisher.",
          link: article.link,
          published: article.published || "",
          source: article.source || "Source unavailable",
          risk_score: 0,
          coords: null,
          coords_default: true,
          machine_assessment: null,
          image_url: article.imageUrl || (article.domain ? `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${article.domain}&size=128` : undefined),
        }));
        if (!live) return;
        setGlobalNewsItems(data);
        setLiveNowItems(data);
        setLiveNowState("live");
      } catch {
        try {
          const fallbackRes = await fetchLiveNews({
            query: liveNewsSearch.trim() || "world news",
            country: liveNewsCountry !== "WORLD" ? liveNewsCountry : undefined,
            signal: controller.signal,
          });
          if (!live || !fallbackRes.articles.length) throw new Error("No fallback articles");
          setLiveNowItems(fallbackRes.articles.map((article, index) => ({
            id: article.url || `fallback-${index}`,
            title: article.title || "Untitled report",
            description: article.description || "Monitored news headline.",
            link: article.url || "",
            published: "",
            source: article.source,
            risk_score: 0,
            coords: null,
            coords_default: true,
            machine_assessment: null,
            image_url: article.imageUrl,
          }))); 
          setLiveNowState("live");
        } catch { if (live) setLiveNowState("stale"); }
      }
    };
    loadLiveNow();
    const interval = window.setInterval(loadLiveNow, POLL_INTERVALS.news * 1000);
    return () => { live = false; controller.abort(); window.clearInterval(interval); };
  }, [liveNewsCountry, liveNewsSearch]);

  useEffect(() => {
    let live = true;
    const loadFires = async () => {
      try {
        const res = await fetch("/public-feeds/wildfires");
        if (!res.ok) throw new Error(`NASA EONET ${res.status}`);
        const data = await res.json();
        if (!live || !Array.isArray(data?.events)) return;
        const pts: GeoMarker[] = [];
        for (const ev of data.events) {
          const g = ev.geometry?.[ev.geometry.length - 1];
          const c = g?.coordinates;
          if (Array.isArray(c) && typeof c[0] === "number") {
            pts.push({ lon: c[0], lat: c[1], kind: "hazard", label: ev.title, detail: `Active wildfire · NASA EONET · ${new Date(g.date).toISOString().slice(0, 10)}` });
          }
        }
        setFireCount(data.events.length);
        setFireMarkers(pts);
        mark("Wildfires · EONET", "live");
      } catch { if (live) { setFireMarkers([]); setFireCount(null); mark("Wildfires · EONET", "sample"); } }
    };
    loadFires();
    const interval = window.setInterval(loadFires, 60000);
    return () => { live = false; window.clearInterval(interval); };
  }, []);
  useEffect(() => {
    let live = true;
    const loadWeather = async () => {
      try {
        const res = await fetch("/public-feeds/weather-alerts");
        if (!res.ok) throw new Error(`NWS ${res.status}`);
        const data = await res.json();
        if (!live || !Array.isArray(data?.features)) return;
        const markers = data.features
          .filter((feature: any) => Array.isArray(feature?.geometry?.coordinates?.[0]?.[0]))
          .slice(0, 80)
          .map((feature: any) => {
            const coords = feature.geometry.coordinates[0][0];
            return {
              lon: coords[0],
              lat: coords[1],
              kind: "hazard" as const,
              label: feature.properties?.event || "Weather alert",
              detail: `${feature.properties?.areaDesc || "NWS alert"} · ${feature.properties?.severity || "Unknown severity"}`,
            };
          });
        setWeatherCount(data.features.length);
        setWeatherMarkers(markers);
        mark("Weather alerts", "live");
      } catch { if (live) { setWeatherMarkers([]); setWeatherCount(null); mark("Weather alerts", "sample"); } }
    };
    loadWeather();
    const interval = window.setInterval(loadWeather, 60000);
    return () => { live = false; window.clearInterval(interval); };
  }, []);
  const on = useMemo(() => new Set(layers.filter(l => l.active).map(l => l.label)), [layers]);
  const globeMarkers = useMemo(() => {
    const out: GeoMarker[] = [];
    if (on.has("Conflict events")) out.push(...globalConflictMarkers);
    if (on.has("Earthquakes · USGS")) out.push(...quakeMarkers);
    if (on.has("Wildfires · EONET")) out.push(...fireMarkers);
    if (on.has("Weather alerts")) out.push(...weatherMarkers);
    if (on.has("Waterways")) out.push(...chokePoints);
    if (on.has("Military flights")) out.push(...flightMarkers);
    if (on.has("Commercial flights")) out.push(...commercialFlightMarkers);
    if (on.has("Camera feeds")) out.push(...cameraMarkers);
    if (on.has("Global incidents")) out.push(...restored.incidents);
    if (on.has("Vessels · AIS")) out.push(...restored.ships);
    if (on.has("Naval vessels")) out.push(...restored.naval);
    for (const [label, points] of Object.entries(referenceLayers)) {
      if (on.has(label)) out.push(...points.map(point => ({ ...point, detail: `Geographic reference · ${point.detail || point.label}` })));
    }
    if (myLocation) out.push({ lon: myLocation[0], lat: myLocation[1], kind: "base", label: "My live location", detail: "Browser GPS position · live location marker" });
    return out;
  }, [on, quakeMarkers, flightMarkers, commercialFlightMarkers, fireMarkers, weatherMarkers, globalConflictMarkers, cameraMarkers, myLocation, restored.incidents, restored.ships, restored.naval]);
  const newsQuery = useMemo(() => {
    const lensQuery: Record<string, string> = {
      Finance: "(markets OR economy OR inflation)",
      Commodity: "(commodity OR oil OR wheat OR copper)",
      Energy: "(energy OR \"power grid\" OR pipeline OR LNG)",
      Tech: "(semiconductor OR datacenter OR \"artificial intelligence\")",
      Calm: "(diplomacy OR ceasefire OR agreement)",
    };
    if (lens !== "World" && lensQuery[lens]) return lensQuery[lens];
    const terms: Record<string, string> = {
      "Conflict events": "conflict", "Protest clusters": "protest", "Military bases": "\"military base\"",
      "Military flights": "\"military aircraft\"", "Vessels · AIS": "shipping", "Submarine cables": "\"undersea cable\"",
      "Earthquakes · USGS": "earthquake", "Wildfires · EONET": "wildfire",
    };
    const active = [...on].map(l => terms[l]).filter(Boolean).slice(0, 5);
    const automatic = active.length ? `(${active.join(" OR ")})` : "(conflict OR crisis OR military)";
    return newsSearch.trim() ? `(${newsSearch.trim()})` : automatic;
  }, [lens, newsSearch, on]);
  useEffect(() => {
    let live = true;
    const loadNews = async () => {
      setNewsState("loading");
      const res = await fetchLiveNews({
        query: newsSearch.trim() || newsQuery,
        country: lens !== "World" ? lens : undefined,
      });
      if (!live) return;
      setNews(res.articles);
      setNewsState(res.status === "live" ? "ok" : "sample");
    };
    loadNews();
    const interval = window.setInterval(loadNews, 45000);
    return () => { live = false; window.clearInterval(interval); };
  }, [lens, newsQuery, newsSearch]);
  useEffect(() => {
    if (!marketQuery.trim()) {
      setMarketNews([]);
      setMarketNewsState("idle");
      return;
    }
    let live = true;
    const timer = window.setTimeout(async () => {
      setMarketNewsState("loading");
      try {
        const query = `${marketQuery.trim()} market`;
        const res = await fetch(`/public-feeds/news?q=${encodeURIComponent(query)}&category=business`);
        const data = await res.json();
        if (!live) return;
        const items = Array.isArray(data?.articles) ? data.articles.map((a: any) => ({
          title: a.title,
          url: a.link || a.url,
          domain: a.source || a.domain,
          time: formatTimeAgo(a.published),
          imageUrl: a.imageUrl,
        })) : [];
        setMarketNews(items);
        setMarketNewsState(items.length ? "ok" : "empty");
      } catch { if (live) setMarketNewsState("empty"); }
    }, 350);
    return () => { live = false; window.clearTimeout(timer); };
  }, [marketQuery]);
  const aiInsights = useMemo(() => {
    return [
      { label: "Latest headline", value: news[0]?.title || "News feed unavailable", detail: news[0] ? `${news[0].source} · ${news[0].time}` : "No verified headline received." },
      { label: "Earthquakes", value: feedStatus["Earthquakes · USGS"] === "live" ? `${earthquakes} reported` : "Feed unavailable", detail: "USGS recent seismic events; map shows magnitude 2.5+." },
      { label: "Wildfires", value: feedStatus["Wildfires · EONET"] === "live" ? `${fireCount ?? 0} returned events` : "Feed unavailable", detail: "NASA EONET open wildfire results, limited to 200." },
      { label: "Aircraft", value: reportedFlightCounts ? `${reportedFlightCounts.total} reported` : "Feed unavailable", detail: flightStatus },
    ];
  }, [earthquakes, fireCount, news, feedStatus, reportedFlightCounts, flightStatus]);
  const toggle = (label: string) => {
    if (label === "Day / night" && !on.has(label)) setIs3dGlobe(true);
    setLayers(old => old.map(l => l.label === label ? { ...l, active: !l.active } : l));
  };
  const openTab = (nextTab: string) => {
    if (rightPanelOpen && tab === nextTab) {
      setRightPanelOpen(false);
      return;
    }
    setTab(nextTab);
    setRightPanelOpen(true);
  };
  const selectAllLayers = () => setLayers(old => old.map(layer => ({ ...layer, active: on.size === layers.length ? false : true })));
  const pinMyLocation = () => {
    if (!myLocation) {
      setLocationStatus("locating");
      navigator.geolocation?.getCurrentPosition(position => {
        const location: [number, number] = [position.coords.longitude, position.coords.latitude];
        setMyLocation(location);
        setMapTarget(location);
        setZoom(3);
        setLocationStatus("live");
        if (locationWatchRef.current == null && navigator.geolocation) {
          locationWatchRef.current = navigator.geolocation.watchPosition(next => {
            setMyLocation([next.coords.longitude, next.coords.latitude]);
            setLocationStatus("live");
          }, () => setLocationStatus("denied"), { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 });
        }
      }, () => setLocationStatus("denied"), { enableHighAccuracy: true, timeout: 10000 });
      return;
    }
    setMapTarget(myLocation);
    setZoom(3);
  };
  const decorate = (l: Layer): Layer => {
    let liveCount: string | null = null;
    if (referenceLayers[l.label]) return { ...l, count: String(referenceLayers[l.label].length) };
    if (l.label === "Day / night") return { ...l, count: "3D" };
    if (l.label === "Submarine cables") return { ...l, count: restored.cables ? String(restored.cables.features.length) : "—" };
    if (l.label === "Global incidents" || l.label === "Vessels · AIS" || l.label === "Naval vessels") {
      const count = l.label === "Global incidents" ? restored.incidents.length : l.label === "Vessels · AIS" ? restored.ships.length : restored.naval.length;
      return { ...l, count: restored.status[l.label] === "live" ? String(count) : "—" };
    }

    if (l.label === "Conflict events" && feedStatus[l.label] === "live") {
      liveCount = String(globalConflictMarkers.length);
    } else if (l.label === "Camera feeds") {
      if (globalCameras.length > 0) liveCount = globalCameras.length.toLocaleString();
      else if (cameraMarkers.length > 0) liveCount = cameraMarkers.length.toLocaleString();
    } else if (l.label === "Earthquakes · USGS" && feedStatus[l.label] === "live") {
      liveCount = earthquakes.toString();
    } else if (l.label === "Wildfires · EONET" && feedStatus[l.label] === "live") {
      liveCount = String(fireCount ?? 0);
    } else if (l.label === "Weather alerts" && feedStatus[l.label] === "live") {
      liveCount = String(weatherCount ?? 0);
    } else if (l.label === "Military flights" && reportedFlightCounts) {
      liveCount = reportedFlightCounts.military.toLocaleString();
    } else if (l.label === "Commercial flights" && reportedFlightCounts) {
      liveCount = reportedFlightCounts.commercial.toLocaleString();
    } else if (l.label === "Satellites · TLE" && feedStatus[l.label] === "live" && satelliteCount != null) {
      liveCount = satelliteCount.toLocaleString();
    } else if (l.label === "Waterways") {
      liveCount = String(chokePoints.length);
    }

    return { ...l, count: liveCount ?? "—" };
  };

  const instabilityHotspots = useMemo(() => [...quakeMarkers]
    .filter(item => Number.isFinite(item.mag))
    .sort((a, b) => (b.mag || 0) - (a.mag || 0))
    .slice(0, 3)
    .map(item => ({ name: item.label, score: `M${item.mag?.toFixed(1)}`, target: [item.lon, item.lat] as [number, number] })), [quakeMarkers]);

  const signals = useMemo(() => {
    const seismic = quakeMarkers.slice(0, 2).map(item => [`M${item.mag?.toFixed(1)} earthquake · ${item.label}`, "USGS", "observed", (item.mag || 0) >= 5 ? "warning" : "neutral"]);
    const headlines = newsState === "ok" ? news.slice(0, 4).map(item => [item.title, item.source, item.time, "neutral"]) : [];
    return [...seismic, ...headlines].slice(0, 5);
  }, [quakeMarkers, news, newsState]);

  const tickerAlerts = useMemo(() => {
    return signals.length ? signals.map((s) => s[0]) : ["Waiting for verified feed updates"];
  }, [signals]);

  if (!launched) return <VigilHero onLaunch={() => setLaunched(true)} clock={clock} />;

  return <main className="glass-dashboard-shell">
    {/* Frosted Glass Navigation Bar (Screenshot 2) */}
    <header className="glass-topbar">
      <div className="glass-brand">
        <img src={vigilLogo} alt="VIGIL" />
        <span>VIGIL <small>World Monitor</small></span>
      </div>

      <div className="glass-lenses-pill">
        {["World", "Tech", "Finance", "Commodity", "Energy", "Calm"].map((x) => (
          <button
            key={x}
            onClick={() => setLens(x)}
            className={`glass-lens-btn ${lens === x ? "active" : ""}`}
          >
            {x}
          </button>
        ))}
      </div>

      <button className="glass-search-trigger" onClick={() => setCommand(true)}>
        <Search size={14} />
        <span>Search commands, countries, layers…</span>
        <kbd>⌘K</kbd>
      </button>

      <div className="glass-top-actions">
        <button
          onClick={() => setShowNewsPanel(!showNewsPanel)}
          className="glass-action-pill"
          title="Global News Channels"
        >
          <AlertTriangle size={14} />
          <span>News</span>
        </button>

        <button
          onClick={() => setShowSatelliteViewer(!showSatelliteViewer)}
          className="glass-action-pill"
          title="Satellite Tracker"
        >
          <span>🛰️</span>
          <span>Satellites</span>
        </button>

        <button
          onClick={() => openTab("Aviation")}
          className={`glass-action-pill ${tab === "Aviation" && rightPanelOpen ? "active" : ""}`}
          title="View observed aircraft"
        >
          <Plane size={14} />
          <span>Aircraft</span>
        </button>

        <button
          onClick={() => { setTab("Cameras"); setRightPanelOpen(true); }}
          className={`glass-action-pill ${tab === "Cameras" && rightPanelOpen ? "active" : ""}`}
          title="Explore published public camera feeds"
          aria-label="EXPLORE PUBLIC CAMERAS"
        >
          <Eye size={14} />
          <span>Cameras</span>
        </button>

        <button
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          className="glass-action-pill"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>

        <span className="glass-clock-badge">
          UTC {clock.toISOString().slice(11, 19)}
        </span>

        <span className="live">
          <i /> MONITORING
        </span>

        <div className="glass-avatar-circle" title="User Profile">
          A
        </div>
      </div>
    </header>

    {/* Body Workspace: Modern 3-Column Glass Layout (Matching Screenshots 1 & 2) */}
    <div className={`glass-workspace ${!showLayersPanel && !rightPanelOpen ? "both-collapsed" : !showLayersPanel ? "left-collapsed" : !rightPanelOpen ? "right-collapsed" : ""}`}>

      {/* 1. LEFT PANEL: Strategic Feeds & Map Layers (Matching Screenshot 2 & Screenshot 1 left rail) */}
      {showLayersPanel ? (
        <aside className="glass-left-panel">
          <div className="glass-panel-header">
            <div className="glass-panel-title">
              <Layers size={14} color="#38bdf8" />
              <span>MAP LAYERS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                className="glass-select-btn"
                onClick={selectAllLayers}
                title="Toggle all layers"
              >
                {on.size === layers.length ? "ALL OFF" : "ALL ON"}
              </button>
              <span className="glass-counter-badge">{on.size}/{layers.length}</span>
              <button
                className="glass-select-btn"
                onClick={() => setShowLayersPanel(false)}
                title="Collapse panel"
                style={{ padding: "3px 6px" }}
              >
                ✕
              </button>
            </div>
          </div>

          <button className="glass-location-btn" onClick={pinMyLocation}>
            <Crosshair size={13} />
            <span>{locationStatus === "live" ? "RECENTER MY LOCATION" : locationStatus === "locating" ? "LOCATING..." : "PIN MY LOCATION"}</span>
          </button>

          <div className="glass-layer-shortcuts" aria-label="Live data views">
            <button onClick={() => openTab("Cameras")}><Eye size={13} /> Camera previews</button>
            <button onClick={() => openTab("Live Now")}><Radio size={13} /> Live news</button>
            <button onClick={() => setShowSatelliteViewer(true)}><GlobeIcon size={13} /> Satellite catalog</button>
            <button onClick={() => openTab("Aviation")}><Plane size={13} /> Air traffic</button>
          </div>
          {/* Layer Categories List */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 4 }}>
            {layerGroups.map((g) => (
              <div key={g} style={{ marginBottom: "12px" }}>
                <p className="glass-group-label">{g}</p>
                {layers
                  .filter((l) => l.group === g)
                  .map((l) => (
                    <LayerRow
                      key={l.label}
                      layer={decorate(l)}
                      status={restored.status[l.label] || feedStatus[l.label]}
                      onToggle={() => toggle(l.label)}
                    />
                  ))}
              </div>
            ))}
          </div>

          {/* Bottom Filter Pills */}
          <p className="layer-data-note">0 = no positions reported · — = unavailable. Waterways and cables are geographic references.</p>
          <div style={{ display: "flex", gap: 4, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
            <button
              className="glass-select-btn"
              style={{ background: is3dGlobe ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.06)", borderColor: is3dGlobe ? "#38bdf8" : undefined }}
              onClick={() => setIs3dGlobe((g) => !g)}
            >
              {is3dGlobe ? "🌐 3D Globe" : "🗺 2D Map"}
            </button>
            <button
              className="glass-select-btn"
              onClick={() => openTab("Aviation")}
            >
              ✈ Aircraft
            </button>
          </div>
        </aside>
      ) : (
        <aside className="glass-sidebar-pill" style={{ height: "100%", alignSelf: "stretch" }}>
          <div className="glass-rail-group">
            <button
              className="glass-rail-icon-btn"
              title="Expand Map Layers"
              onClick={() => setShowLayersPanel(true)}
            >
              <Layers size={18} />
              <small className="rail-caption">Layers</small>
            </button>
            <button
              className="glass-rail-icon-btn"
              title="Toggle 3D / 2D"
              onClick={() => setIs3dGlobe((g) => !g)}
            >
              <Compass size={18} />
            </button>
            <button
              className="glass-rail-icon-btn"
              title="Observed aircraft"
              onClick={() => openTab("Aviation")}
            >
              <Plane size={18} />
            </button>
            <button
              className="glass-rail-icon-btn"
              title="Global Intel"
              onClick={() => setRightPanelOpen(true)}
            >
              <Radar size={18} />
            </button>
          </div>
        </aside>
      )}

      {/* Full-screen Earth canvas with floating controls. */}
      <section className="glass-map-zone" style={{ position: "relative", minWidth: 0, height: "100%", borderRadius: 20, overflow: "hidden", border: "1px solid var(--glass-border)", background: "#060911" }}>
        {/* Floating Top Map Toolbar */}
        <div className="glass-map-toolbar">
          <div className="glass-operating-badge">
            <span>{is3dGlobe ? "SATELLITE SURVEILLANCE // 3D GLOBE" : "TACTICAL PROJECTION // 2D FLAT"}</span>
            <small>MAP LAYERS UPDATE WHEN SOURCES RESPOND</small>
          </div>

          <div className="glass-map-tools-group">
            <button
              className={`glass-map-tool-btn ${is3dGlobe ? "active" : ""}`}
              onClick={() => setIs3dGlobe(true)}
              title="Interactive 3D globe"
            >
              <Compass size={13} />
              <span>3D Globe</span>
            </button>
            <button
              className={`glass-map-tool-btn ${!is3dGlobe ? "active" : ""}`}
              onClick={() => setIs3dGlobe(false)}
              title="Flat 2D Projection"
            >
              <GlobeIcon size={13} />
              <span>2D Map</span>
            </button>
            <button className={`glass-map-tool-btn ${streetViewMode ? "active" : ""}`} onClick={() => setStreetViewMode(value => !value)} title="Choose a street location on the map">
              <Eye size={13} /><span>Street View</span>
            </button>
            <button
              className="glass-map-tool-btn"
              onClick={() => setZoom((z) => Math.min(5, +(z + 0.3).toFixed(2)))}
              title="Zoom In"
            >
              +
            </button>
            <button
              className="glass-map-tool-btn"
              onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.3).toFixed(2)))}
              title="Zoom Out"
            >
              −
            </button>
            <button
              className="glass-map-tool-btn"
              onClick={() => {
                setMapTarget([0, 20]);
                setZoom(1);
              }}
              title="Reset View"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Floating seismic panel with a persistent reopen control. */}
        {showEarthquakeCard ? (
          <div className="glass-instability-card">
            <div className="glass-instability-head">
              <strong>RECENT EARTHQUAKES</strong>
              <span>{feedStatus["Earthquakes · USGS"] === "live" ? "USGS" : "UNAVAILABLE"}</span>
              <button type="button" className="glass-instability-close" onClick={() => setShowEarthquakeCard(false)} aria-label="Hide earthquake panel" title="Hide earthquake panel">×</button>
            </div>
            {instabilityHotspots.length === 0 && <p className="news-empty">No current seismic feed.</p>}
            {instabilityHotspots.slice(0, 3).map((item) => (
              <button
                type="button"
                key={`${item.name}-${item.target[0]}`}
                className="glass-instability-item"
                onClick={() => {
                  setMapTarget(item.target);
                  setZoom(2.8);
                }}
                title={`Focus ${item.name}`}
              >
                <span className="code">EQ</span>
                <span title={item.name}>{item.name}</span>
                <span className="score">{item.score}</span>
                <span className="trend">↗</span>
              </button>
            ))}
          </div>
        ) : (
          <button type="button" className="glass-instability-toggle" onClick={() => setShowEarthquakeCard(true)} aria-label="Show earthquake panel" title="Show recent earthquakes">
            <Radar size={14} />
            <span>Earthquakes</span>
            <small>{feedStatus["Earthquakes · USGS"] === "live" ? earthquakes : "—"}</small>
          </button>
        )}

        {/* Earth imagery and live data on the same 3D/2D map. */}
        <div className="world-map" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
            <Globe
              cables={on.has("Submarine cables") ? restored.cables : null}
              onMapCenter={(center) =>
                setFlightCenter((previous) =>
                  Math.abs(previous[0] - center[0]) + Math.abs(previous[1] - center[1]) > 0.1
                    ? center
                    : previous
                )
              }
              markers={globeMarkers}
              satellites={on.has("Satellites · TLE") ? satellites : []}
              flat={!is3dGlobe}
              satelliteEnabled={true}
              streetViewMode={streetViewMode}
              onStreetViewClick={coords => { setStreetViewTarget(coords); setStreetViewMode(false); }}
              zoom={zoom}
              target={mapTarget}
              onSelect={(marker, satellite) => {
                if (marker.flight) {
                  setSelectedAircraft(marker.flight);
                  return;
                }
                const cam = globalCameras.find((c) => marker.cameraId ? c.id === marker.cameraId : c.name === marker.label);
                if (cam) {
                  setActiveCamera(cam);
                  return;
                }
                setSelectedPoint({ marker, satellite });
              }}
            />
        </div>

        {/* Breaking Alert Marquee Ticker */}
        <div className="glass-alert-ticker">
          <div className="glass-alert-ticker-tag">
            <Radio size={12} color="#f43f5e" />
            <span>BREAKING ALERTS</span>
          </div>
          <div className="glass-alert-ticker-marquee">
            <div>
              {tickerAlerts.map((item, index) => (
                <span key={`${item}-${index}`} style={{ marginRight: 28 }}>
                  <b style={{ color: "#38bdf8", marginRight: 6 }}>●</b>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* 3. RIGHT PANEL: Global Intel & Feeds */}
      <aside className={`glass-right-panel ${rightPanelOpen ? "" : "collapsed"}`}>
        {rightPanelOpen ? (
          <>
            <div className="glass-panel-header" style={{ padding: "12px 14px 6px" }}>
              <div className="glass-panel-title">
                <Radar size={14} color="#38bdf8" />
                <span>GLOBAL INTEL & FEEDS</span>
              </div>
              <button
                className="glass-select-btn"
                onClick={() => setRightPanelOpen(false)}
                title="Collapse panel"
              >
                ✕
              </button>
            </div>

            {/* Horizontal Tabs Switcher */}
            <div className="glass-tab-bar">
              {rightPanelOptions.map(([label, Icon]) => (
                <button
                  key={label}
                  className={`glass-tab-btn ${tab === label ? "active" : ""}`}
                  onClick={() => openTab(label)}
                  title={label}
                >
                  <Icon size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Panel Content */}
            <div className="glass-panel-content">

          {tab === "Signals" && (
            <>
              <div className="section-head"><span>OBSERVED UPDATES</span><small>USGS + published news</small></div>
              {signals.length === 0 && <p className="news-empty">Waiting for verified feed updates. No sample alerts are shown.</p>}
              {signals.map((s) => (
                <article className="signal" key={s[0]}>
                  <i className={s[3]} />
                  <div><h3>{s[0]}</h3><p>{s[1]} <b>·</b> {s[2]}</p></div>
                </article>
              ))}
              <div className="correlation">
                <p>DATA TRANSPARENCY</p>
                <h3>Source first</h3>
                <span>Updates appear only when a connected publisher or sensor feed returns data. Empty feeds remain empty.</span>
              </div>
            </>
          )}

          {tab === "Live Now" && (
            <div className="live-now-panel">
              <div className="section-head"><span>LIVE NEWS</span><small className={liveNowState === "live" ? "feed live" : "feed sample"}>{liveNowState === "live" ? "REFRESHING EVERY 90S" : liveNowState === "loading" ? "LOADING" : "UNAVAILABLE"}</small></div>
              <form className="live-news-filters" onSubmit={(event) => { event.preventDefault(); setLiveNewsSearch(liveNewsSearch.trim()); }}>
                <input value={liveNewsSearch} onChange={(event) => setLiveNewsSearch(event.target.value)} placeholder="Search global news..." aria-label="Search live global news" />
                <select value={liveNewsCountry} onChange={(event) => setLiveNewsCountry(event.target.value)} aria-label="Filter news by country">
                  <option value="WORLD">World</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="IN">India</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="JP">Japan</option>
                  <option value="BR">Brazil</option>
                  <option value="ZA">South Africa</option>
                </select>
                <button type="submit">SEARCH</button>
              </form>
              <p className="news-scope">Free global news index · {liveNewsCountry === "WORLD" ? "all countries" : liveNewsCountry} · newest monitored reports first</p>
              {liveNowItems.length === 0 && <p className="news-empty">{liveNowState === "loading" ? "Loading trusted global news…" : "No matching reports found."}</p>}
              {liveNowItems.map((item) => (
                <a className="newsitem live-now-item" key={item.id} href={item.link} target="_blank" rel="noreferrer">
                  {item.image_url ? (
                    <img className="live-news-thumb" src={item.image_url} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                  ) : (
                    <span className="live-news-thumb news-thumb-placeholder">NEWS</span>
                  )}
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.source} <b>·</b> {item.published ? new Date(item.published).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "time unavailable"}</p>
                  </div>
                </a>
              ))}
            </div>
          )}

          {tab === "Feed Brief" && (
            <>
              <div className="section-head"><span>FEED BRIEF</span><small className={newsState === "ok" ? "feed live" : "feed sample"}>{newsState === "ok" ? "LIVE INPUTS" : "PARTIAL DATA"}</small></div>
              {aiInsights.map((item) => (
                <article className="ai-insight" key={item.label}>
                  <small>{item.label}</small>
                  <h3>{item.value}</h3>
                  <p>{item.detail}</p>
                </article>
              ))}
              <div className="open-source-panel">
                <p>FREE OPEN SOURCES</p>
                {openSources.map((source) => (
                  <div key={source[0]}>
                    <strong>{source[0]}</strong>
                    <span>{source[1]}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "Markets" && (
            <div className="markets-workspace">
              <form className="market-search" onSubmit={(e) => { e.preventDefault(); setMarketQuery(marketQuery.trim()); }}>
                <input value={marketQuery} onChange={(e) => setMarketQuery(e.target.value)} placeholder="Search market impact…" aria-label="Search market impact" />
                <button type="submit">SEARCH</button>
              </form>
              <div className="section-head"><span>BITCOIN SPOT PRICE</span><small>COINGECKO · 24H CHANGE</small></div>
              {marketRows.length === 0 && <p className="news-empty">Market price feed unavailable. No cached quote is shown.</p>}
              {marketRows.map((m) => (
                <div className="market" key={m[0]}>
                  <div><strong>{m[0]}</strong><small>{m[1]}</small></div>
                  <b className="ticking">${m[2]}</b>
                  <em className={m[4]}>{m[3]}</em>
                </div>
              ))}
              {marketQuery.trim() && <div className="section-head"><span>RELATED PUBLISHED NEWS</span><small>{marketNewsState === "loading" ? "LOADING" : marketNewsState === "ok" ? "LIVE SOURCES" : "NO RESULTS"}</small></div>}
              {marketQuery.trim() && marketNews.map(item => <a className="newsitem" key={item.url} href={item.url} target="_blank" rel="noreferrer"><div><h3>{item.title}</h3><p>{item.domain} · {item.time}</p></div></a>)}
            </div>
          )}

          {tab === "Aviation" && (
            <div>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--tactical-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: 700 }}>OBSERVED AIRCRAFT</span>
              </div>
              <FlightPanel flights={aircraft} status={flightStatus} reportedCounts={reportedFlightCounts} onSelect={setSelectedAircraft} />
            </div>
          )}

          {tab === "Cameras" && <CameraPanel cameras={globalCameras} status={cameraStatus} onSelect={setActiveCamera} onLocate={camera => { setLayers(old => old.map(layer => layer.label === "Camera feeds" ? { ...layer, active: true } : layer)); setMapTarget([camera.lng, camera.lat]); setZoom(2); }} />}
          {tab === "Weather" && <WeatherPanel snapshot={weatherSnapshot} state={weatherState} />}
          {tab === "Chokepoints" && (
            <>
              <div className="section-head"><span>MARITIME CHOKEPOINTS</span><small>REFERENCE LOCATIONS</small></div>
              <p className="news-scope">AIS vessel telemetry is not connected. Select a waterway to locate it on the globe.</p>
              {chokePoints.map((point) => (
                <button className="choke" key={point.label} onClick={() => { setMapTarget([point.lon, point.lat]); setZoom(2.8); }}>
                  <div><strong>{point.label}</strong><small>{point.lat.toFixed(2)}°, {point.lon.toFixed(2)}°</small></div>
                </button>
              ))}
            </>
          )}

          {tab === "News" && (
            <>
              <div className="news-tab-head">
                <div className="section-head"><span>PUBLISHED NEWS</span><small className={newsState === "ok" ? "feed live" : "feed sample"}>{newsState === "ok" ? "LIVE" : newsState === "loading" ? "…" : "UNAVAILABLE"}</small></div>
                <form className="global-news-search" onSubmit={(event) => { event.preventDefault(); setNewsSearch(newsSearch.trim()); }}>
                  <input value={newsSearch} onChange={(event) => setNewsSearch(event.target.value)} placeholder="Search Google News & global feeds..." aria-label="Search worldwide news" />
                  <button type="submit">SEARCH</button>
                  {newsSearch && <button type="button" onClick={() => setNewsSearch("")} aria-label="Clear worldwide news search">×</button>}
                </form>
              </div>
              <p className="news-scope">SCOPE {newsQuery} · WORLDWIDE SOURCES</p>
              {news.length === 0 && <p className="news-empty">{newsState === "loading" ? "Scanning Google News & verified sources…" : "No live articles for this scope right now."}</p>}
              {news.map((n) => (
                <a className="newsitem newsitem-with-thumb" key={n.id || n.url} href={n.url} target="_blank" rel="noreferrer">
                  {n.imageUrl ? (
                    <img className="newsitem-thumb" src={n.imageUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                  ) : (
                    <span className="newsitem-thumb news-thumb-placeholder">NEWS</span>
                  )}
                  <div className="newsitem-body">
                    <h3>{n.title}</h3>
                    <p>{n.source || n.sourceDomain} <b>·</b> {n.time}</p>
                  </div>
                </a>
              ))}
            </>
          )}

          {(tab === "News" || tab === "Live Now") && (
            <div style={{ marginTop: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "10px" }}>
              <LiveTV channel={channel} setChannel={setChannel} lens={lens} />
            </div>
          )}
        </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 4px", gap: 10 }}>
          <button
            className="glass-select-btn"
            onClick={() => setRightPanelOpen(true)}
            title="Expand Intelligence Panel"
            style={{ width: 36, height: 36, borderRadius: "50%", padding: 0, display: "grid", placeItems: "center" }}
          >
            <Radar size={16} />
          </button>
          {rightPanelOptions.slice(0, 6).map(([label, Icon]) => (
            <button
              key={label}
              className="glass-select-btn"
              onClick={() => {
                openTab(label);
                setRightPanelOpen(true);
              }}
              title={label}
              style={{ width: 32, height: 32, borderRadius: "50%", padding: 0, display: "grid", placeItems: "center" }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      )}
      </aside>

    </div>

    {/* Modern Glass Footer */}
    <footer className="glass-footer">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "#34d399", display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
          <i style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block", boxShadow: "0 0 8px #34d399" }} />
          SYSTEMS ONLINE
        </span>
        <span style={{ color: "#64748b" }}>|</span>
        <span>LATENCY 14MS</span>
        <span style={{ color: "#64748b" }}>|</span>
        <span>SATELLITE IMAGERY</span>
        <span style={{ color: "#64748b" }}>|</span>
        <span style={{ color: "#38bdf8" }}>{is3dGlobe ? "3D GLOBE ACTIVE" : "2D PROJECTION"}</span>
      </div>

      <div style={{ color: "#94a3b8", letterSpacing: "0.08em" }}>
        VIGIL OSINT MONITOR · PUBLIC DATA SOURCES
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span>LAT/LNG: {mapTarget ? `${mapTarget[1].toFixed(2)}°, ${mapTarget[0].toFixed(2)}°` : "0.00°, 0.00°"}</span>
        <span style={{ color: "#64748b" }}>|</span>
        <span>ZOOM: {zoom}X</span>
      </div>
    </footer>

    {/* Modals & Dialogs */}
    {selectedAircraft && (
      <AircraftDossier
        key={selectedAircraft.icao24}
        flight={selectedAircraft}
        onClose={() => setSelectedAircraft(null)}
        onLocate={(f) => {
          if (hasPosition(f)) {
            setIs3dGlobe(true);
            setMapTarget([f.lng, f.lat]);
            setZoom(2);
          }
        }}
      />
    )}
    {selectedPoint && (
      <PointDialog
        point={selectedPoint.marker}
        satellite={selectedPoint.satellite}
        news={news}
        onClose={() => setSelectedPoint(null)}
      />
    )}
    {command && (
      <Command
        onClose={() => setCommand(false)}
        onCountry={(x, lat, lng) => {
          if (lat !== undefined && lng !== undefined) {
            setIs3dGlobe(true);
            setMapTarget([lng, lat]);
            setCommand(false);
            return;
          }
          setCommand(false);
        }}
      />
    )}
    {showNewsPanel && (
      <div className="modal-overlay">
        <NewsPanel onClose={() => setShowNewsPanel(false)} />
      </div>
    )}
    {showSatelliteViewer && (
      <div className="modal-overlay">
        <LiveSatelliteCatalog
          satellites={satellites}
          sourceState={feedStatus["Satellites · TLE"]}
          onClose={() => setShowSatelliteViewer(false)}
          onLocate={(satellite) => {
            setIs3dGlobe(true);
            setMapTarget([satellite.lng, satellite.lat]);
            setZoom(3);
            setShowSatelliteViewer(false);
          }}
        />
      </div>
    )}
    {activeCamera && (
      <CameraViewer
        camera={activeCamera}
        onClose={() => setActiveCamera(null)}
        onStreetView={(lat, lng) => { setActiveCamera(null); setStreetViewTarget([lng, lat]); }}
        onLocate={(lat, lng) => {
          setIs3dGlobe(true);
          setMapTarget([lng, lat]);
          setActiveCamera(null);
          setZoom(2);
        }}
      />
    )}
    {streetViewTarget && <StreetViewModal target={streetViewTarget} onClose={() => setStreetViewTarget(null)} />}
  </main>;
}

function gdeltAgo(seendate: string) {
  // GDELT format: YYYYMMDDTHHMMSSZ
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(seendate);
  if (!m) return "recent";
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

const tvChannels: { name: string; id: string; tag: string }[] = [
  { name: "NDTV India", id: "UCZFMm1mMw0F81Z37aaEzTUA", tag: "INDIA" },
  { name: "India Today", id: "UCYPvAwZP8pZhSMW8qs7cVCw", tag: "INDIA" },
  { name: "Aaj Tak", id: "UCt4t-jeY85JegMlZ-E5UWtA", tag: "INDIA" },
  { name: "WION", id: "UC_gUM8rL-Lrg6O3adPW9K1g", tag: "INDIA/WORLD" },
  { name: "Al Jazeera", id: "UCNye-wNBqNL5ZzHSJj3l8Bg", tag: "WORLD" },
  { name: "DW News", id: "UCknLrEdhRCp1aegoMqRaCZg", tag: "WORLD" },
  { name: "Sky News", id: "UCoMdktPbSTixAyNGwb-UYkQ", tag: "WORLD" },
  { name: "Bloomberg", id: "UCIALMKvObZNtJ6AmdCLP7Lg", tag: "FINANCE" },
  { name: "ABC News", id: "UCBi2mrWuNuyYy4gbM6fU18Q", tag: "US" },
];

function LiveSatelliteCatalog({ satellites, sourceState, onClose, onLocate }: {
  satellites: GlobalSatellite[];
  sourceState?: "live" | "sample";
  onClose: () => void;
  onLocate: (satellite: GlobalSatellite) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => satellites.filter(satellite =>
    `${satellite.name} ${satellite.noradId} ${satellite.category}`.toLowerCase().includes(query.toLowerCase().trim()),
  ).slice(0, 80), [satellites, query]);
  return <section className="live-satellite-catalog" role="dialog" aria-modal="true" aria-label="Satellite catalog">
    <header><div><small>LIVE ORBITAL DATA</small><h2>Satellite catalog</h2><p>{sourceState === "live" ? `${satellites.length.toLocaleString()} ${satellites.length === 1 ? "position" : "positions"} from the connected orbital feed` : "Satellite feed unavailable. No generated positions are shown."}</p></div><button onClick={onClose} aria-label="Close satellite catalog">×</button></header>
    <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search satellite name, NORAD ID, or category" aria-label="Search satellites" />
    <div className="live-satellite-list">
      {results.map(satellite => <button key={`${satellite.noradId}-${satellite.name}`} onClick={() => onLocate(satellite)}><span><strong>{satellite.name}</strong><small>NORAD {satellite.noradId} · {satellite.category}</small></span><span>{Math.round(satellite.alt).toLocaleString()} km <b>↗</b></span></button>)}
      {results.length === 0 && <p>No satellite positions match this search or the feed is unavailable.</p>}
    </div>
  </section>;
}

function LiveTV({ channel, setChannel, lens }: { channel: number; setChannel: (n: number) => void; lens: string }) {
  const c = tvChannels[channel] ?? tvChannels[0];
  const [embedMode, setEmbedMode] = useState<"live" | "search">("search");
  const isIndian = c.tag.includes("INDIA");
  useEffect(() => {
    setEmbedMode("live");
    if (!isIndian) return;
    const fallbackTimer = window.setTimeout(() => setEmbedMode("search"), 9000);
    return () => window.clearTimeout(fallbackTimer);
  }, [c.id, isIndian]);
  const embedSrc = embedMode === "search"
    ? `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(`${c.name} live news`)}&autoplay=1&mute=1`
    : `https://www.youtube-nocookie.com/embed/live_stream?channel=${c.id}&autoplay=1&mute=1&controls=1&rel=0`;
  return <div className="livetv">
    <div className="section-head"><span>LIVE BROADCAST</span><small className="feed live">ON AIR</small></div>
    <div className="tv-frame broadcast-card">
      <iframe
        key={c.id}
        title={`${c.name} live broadcast`}
        src={embedSrc}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      <div className="broadcast-overlay">
        <span className="broadcast-signal">{embedMode === "search" ? "LIVE SEARCH" : "LIVE NEWS DESK"} · {c.name}</span>
        <a href={`https://www.youtube.com/channel/${c.id}/live`} target="_blank" rel="noreferrer">Visit live site ↗</a>
      </div>
    </div>
    <div className="tv-channels">{tvChannels.map((ch, i) => <button key={ch.id} className={i === channel ? "active" : ""} onClick={() => setChannel(i)}>{ch.name}<em>{ch.tag}</em></button>)}</div>
    <p className="tv-note">24/7 free news livestreams via YouTube. Now framing <b>{lens}</b> lens · {c.name}.</p>
  </div>;
}

function LayerRow({ layer, status, onToggle }: { layer: Layer; status?: "live" | "sample"; onToggle: () => void }) {
  const displayCount = layer.count || "—";
  return (
    <button
      className={`glass-layer-row ${layer.active ? "active" : ""}`}
      onClick={onToggle}
      aria-pressed={layer.active}
      title={`${layer.label}: ${displayCount}`}
    >
      <i className="glass-layer-dot" style={{ backgroundColor: KIND_COLOR[layer.kind] || "#38bdf8" }} />
      <span className={`glass-toggle ${layer.active ? "on" : ""}`}><i /></span>
      <span className="glass-layer-name">
        <span className="glass-layer-label-text">{layer.label}</span>
        {layer.active && (referenceLayers[layer.label] || layer.label === "Submarine cables" || layer.label === "Waterways") ? <em className="glass-live-feed-pill">REF</em> : status === "live" && layer.active && <em className="glass-live-feed-pill">LIVE</em>}
      </span>
      <b className="glass-layer-count-badge">{displayCount}</b>
    </button>
  );
}
function PointDialog({ point, satellite, news, onClose }: { point: GeoMarker; satellite?: GlobalSatellite; news: NewsArticle[]; onClose: () => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const relatedNews = news.filter(item => `${item.title} ${item.sourceDomain || ""}`.toLowerCase().includes(point.label.toLowerCase().split(/[,·]/)[0].trim())).slice(0, 3);

  useEffect(() => {
    let live = true;
    setImageUrl(null);
    setImageLoading(true);
    if (!point.flight) {
      setImageLoading(false);
      return;
    }
    const searchTerms = point.flight
      ? [point.flight.model, point.flight.type, point.flight.registration, point.flight.airline_code].filter(Boolean)
      : [point.label.replace(/[·,].*$/, "").trim()];
    const findImage = async () => {
      for (const term of searchTerms) {
        const query = encodeURIComponent(`${term} aircraft`);
        const response = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json&origin=*`);
        const data = await response.json();
        const page = Object.values(data?.query?.pages || {})[0] as { imageinfo?: { thumburl?: string; url?: string }[] } | undefined;
        const image = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url;
        if (image) return image;
      }
      return null;
    };
    findImage().then(image => {
        if (!live) return;
        setImageUrl(image);
        setImageLoading(false);
    }).catch(() => { if (live) setImageLoading(false); });
    return () => { live = false; };
  }, [point.label]);

  return <section className="point-dialog" role="dialog" aria-label={`${point.label} details`}>
    <header><div><p>MAP POINT</p><h2>{point.label}</h2></div><button onClick={onClose} aria-label="Close details">×</button></header>
    <div className="point-media">
      {imageUrl ? <img src={imageUrl} alt={`Reference image for ${point.label}`} onError={() => setImageUrl(null)} /> : <div className={`point-illustration ${point.kind}`}><span>{point.kind === "flight" ? "✈" : point.kind === "vessel" ? "⚓" : point.kind === "hazard" ? "△" : point.kind === "base" ? "⌂" : point.kind === "cable" ? "⌁" : "◉"}</span><small>{imageLoading ? "SEARCHING VISUAL SOURCES" : "ILLUSTRATIVE MAP REFERENCE"}</small></div>}
    </div>
    <div className="point-type"><i style={{ backgroundColor: KIND_COLOR[point.kind] }} />{point.kind.toUpperCase()} · {point.lat.toFixed(3)}°, {point.lon.toFixed(3)}°</div>
    <p className="point-detail">{point.detail || "No additional detail is available for this point."}</p>
    {point.flight && <div className="aircraft-dossier"><div className="aircraft-dossier-title"><span>✈ AIRCRAFT TELEMETRY</span><small>{point.flight.grounded ? "GROUNDED" : "AIRBORNE"}</small></div><div className="aircraft-dossier-grid"><div><span>CALLSIGN</span><strong>{point.flight.callsign || "—"}</strong></div><div><span>ICAO24</span><strong>{point.flight.icao24 || "—"}</strong></div><div><span>OPERATOR</span><strong>{point.flight.airline_code || "Unknown"}</strong></div><div><span>REGISTRATION</span><strong>{point.flight.registration || "—"}</strong></div><div><span>AIRCRAFT</span><strong>{point.flight.model || point.flight.type || "Unknown"}</strong></div><div><span>CATEGORY</span><strong>{point.flight.category || point.flight.aircraft_category || "—"}</strong></div><div><span>ALTITUDE</span><strong>{Number.isFinite(point.flight.alt) ? `${Math.round(point.flight.alt).toLocaleString()} m` : "—"}</strong></div><div><span>SPEED / HEADING</span><strong>{Number.isFinite(point.flight.speed_knots) ? `${Math.round(point.flight.speed_knots)} kt` : "—"} / {Number.isFinite(point.flight.heading) ? `${Math.round(point.flight.heading)}°` : "—"}</strong></div><div><span>SQUAWK</span><strong>{point.flight.squawk || "—"}</strong></div><div><span>POSITION</span><strong>{point.flight.lat.toFixed(4)}°, {point.flight.lng.toFixed(4)}°</strong></div></div></div>}
    <div className="point-metadata"><div><span>LATITUDE</span><strong>{point.lat.toFixed(5)}°</strong></div><div><span>LONGITUDE</span><strong>{point.lon.toFixed(5)}°</strong></div><div><span>SOURCE</span><strong>{satellite ? "TLE CATALOGUE" : point.flight ? "FLIGHT FEED" : point.detail?.includes("USGS") ? "USGS" : point.detail?.includes("NASA EONET") ? "NASA EONET" : point.detail?.includes("NWS") ? "NWS" : "REFERENCE / FEED"}</strong></div><div><span>STATUS</span><strong className="point-status-live">{point.detail?.includes("Reference") ? "REFERENCE LOCATION" : "OBSERVED REPORT"}</strong></div></div>
    {satellite && <div className="point-stats"><span>ALTITUDE <b>{satellite.alt.toLocaleString()} km</b></span><span>MISSION <b>{satellite.mission || satellite.category}</b></span></div>}
    <div className="point-updates"><div className="point-updates-head"><span>LIVE UPDATES</span><small>{relatedNews.length ? "VERIFIED NEWS" : "NO MATCHED HEADLINES"}</small></div>{relatedNews.length ? relatedNews.map(item => <a key={item.id || item.url} href={item.url} target="_blank" rel="noreferrer" className="point-news-link">{item.imageUrl && <img className="point-news-thumb" src={item.imageUrl} alt="" onError={e => { e.currentTarget.style.display = "none"; }} />}<div><strong>{item.title}</strong><small>{item.source} · {item.time}</small></div></a>) : <p>Live headlines for this point are not available in the current feed.</p>}</div>
    <button className="point-locate" onClick={onClose}>Dismiss</button>
  </section>;
}
function EventPanel({ event, onClose }: { event: EventMarker; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"updates" | "news" | "timeline" | "impact">("updates");
  
  return <section className="event-panel">
    <header>
      <div>
        <p className="event-header-label">LIVE EVENT</p>
        <h2>{event.fullTitle || event.label} <small>· {event.label.slice(0, 2).toUpperCase()}</small></h2>
        <p className="event-detail">{event.detail}</p>
      </div>
      <button onClick={onClose}>×</button>
    </header>
    
    <nav className="event-tabs">
      {(["updates", "news", "timeline", "impact"] as const).map(tab => (
        <button 
          key={tab} 
          onClick={() => setActiveTab(tab)}
          className={activeTab === tab ? "active" : ""}
        >
          {tab === "updates" && "⚡ UPDATES"}
          {tab === "news" && "📰 NEWS"}
          {tab === "timeline" && "📅 TIMELINE"}
          {tab === "impact" && "📊 IMPACT"}
        </button>
      ))}
    </nav>

    <div className="event-content">
      {activeTab === "updates" && (
        <div className="updates-section">
          {event.updates && event.updates.length > 0 ? (
            event.updates.map((update, idx) => (
              <article key={idx} className="update-item">
                <div className="update-time">{update.time}</div>
                <h4>{update.title}</h4>
                <p>{update.description}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">No updates available</p>
          )}
        </div>
      )}

      {activeTab === "news" && (
        <div className="news-section">
          {event.news && event.news.length > 0 ? (
            event.news.map((item, idx) => (
              <article key={idx} className="news-item-event">
                <h4>{item.title}</h4>
                <p><strong>{item.domain}</strong> · {item.time}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">No news available</p>
          )}
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="timeline-section">
          {event.timeline && event.timeline.length > 0 ? (
            <div className="event-timeline">
              {event.timeline.map((item, idx) => (
                <div key={idx} className={`timeline-item severity-${item.severity}`}>
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <span className="timeline-date">{item.date}</span>
                    <p>{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No timeline available</p>
          )}
        </div>
      )}

      {activeTab === "impact" && (
        <div className="impact-section">
          {event.impact && event.impact.length > 0 ? (
            <div className="impact-grid">
              {event.impact.map((item, idx) => (
                <div key={idx} className="impact-card">
                  <span className="impact-icon">{item.icon}</span>
                  <div>
                    <p className="impact-category">{item.category}</p>
                    <strong className="impact-value">{item.value}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No impact data available</p>
          )}
        </div>
      )}
    </div>
  </section>;
}
function Command({ onClose, onCountry }: { onClose: () => void; onCountry: (x: string, lat?: number, lng?: number) => void }) { 
  const [query, setQuery] = useState(""); 
  const [results, setResults] = useState<{name: string, lat: number, lon: number, type: string}[]>([]);
  
  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
        const data = await res.json();
        setResults(data.map((x: any) => ({
          name: x.display_name,
          lat: parseFloat(x.lat),
          lon: parseFloat(x.lon),
          type: x.type
        })));
      } catch (e) {
         // handle quietly
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const choices = [
    { name: "New Delhi", lat: 28.6139, lon: 77.2090 },
    { name: "London", lat: 51.5072, lon: -0.1276 },
    { name: "New York", lat: 40.7128, lon: -74.0060 },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  ].filter(place => place.name.toLowerCase().includes(query.toLowerCase()));
  
  return <div className="modal-backdrop command-backdrop" onClick={onClose}><section className="command-modal" onClick={e => e.stopPropagation()}><div><span>⌕</span><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search commands, countries, layers…" /><kbd>ESC</kbd></div><p>QUICK JUMP</p>
  {results.length > 0 ? results.map((r, i) => <button key={r.name + i} onClick={() => onCountry(r.name, r.lat, r.lon)}><small>{i + 1}</small>{r.name.substring(0, 45)}{r.name.length > 45 ? "..." : ""}<span>{r.type.toUpperCase()}</span></button>) : choices.map((place, i) => <button key={place.name} onClick={() => onCountry(place.name, place.lat, place.lon)}><small>{i + 1}</small>{place.name}<span>LOCATION</span></button>)}
  </section></div>; 
}

function VigilHero({ onLaunch, clock }: { onLaunch: () => void; clock: Date }) {
  return (
    <main className="vigil-hero">
      <div className="hero-topline">
        <div className="brand"><img src={vigilLogo} alt="VIGIL" /><span>VIGIL</span></div>
        <div className="hero-status"><span className="live"><i /> LIVE INTELLIGENCE</span><span>UTC {clock.toISOString().slice(11, 19)}</span></div>
      </div>

      <section className="hero-stage">
        <div className="hero-copy">
          <span className="eyebrow">WORLD MONITOR DASHBOARD</span>
          <h1>VIGIL</h1>
          <p>
            A real-time operating picture for world events, India-first news, market pressure,
            climate hazards, maritime chokepoints, aircraft movement, and satellite context.
          </p>
          <div className="hero-actions">
            <button className="launch-btn" onClick={onLaunch}>Launch Dashboard</button>
            <span>GDELT · USGS · NASA EONET · OpenSky · Open Notify</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-globe">
            <span className="pulse-point p-india" />
            <span className="pulse-point p-redsea" />
            <span className="pulse-point p-pacific" />
            <span className="satellite-dot" />
          </div>
          <div className="hero-card hero-card-a">
            <small>INDIA DESK</small>
            <strong>Default channel active</strong>
            <span>Politics · ports · weather · security</span>
          </div>
          <div className="hero-card hero-card-b">
            <small>SATELLITE VIEW</small>
            <strong>ISS ground track linked</strong>
            <span>Open Notify live position</span>
          </div>
          <div className="hero-signal-stack">
            {["Red Sea transit risk elevated", "USGS seismic feed synchronized", "India regional happenings scanning"].map((item) => (
              <div key={item}><i />{item}</div>
            ))}
          </div>
        </div>
      </section>

      <div className="hero-metrics">
        <div><span>12</span><small>Fused signal layers</small></div>
        <div><span>24/7</span><small>News channel watch</small></div>
        <div><span>5s</span><small>ISS refresh cadence</small></div>
        <div><span>India</span><small>Default briefing lens</small></div>
      </div>
    </main>
  );
}
