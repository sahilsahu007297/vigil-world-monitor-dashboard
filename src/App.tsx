import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { KIND_COLOR, type GeoMarker } from "./Globe";
import { militaryBases } from "./geodata";
import NewsPanel from "./NewsPanel";
import { type NewsArticle } from "./newsdata";
import { fetchLiveNews, formatTimeAgo } from "./services/news";
import SatelliteViewer from "./SatelliteViewer";
import CameraViewer from "./CameraViewer";
import CameraPanel from "./CameraPanel";
import FlightPanel, { AircraftDossier } from "./FlightPanel";
import { hasPosition, isAircraftPosition, nearbyAircraft } from "./services/airplanes";
import { publicCameras } from "./services/cameras";
import vigilLogo from "./Vigil-Logo.png";
import { AlertTriangle, BarChart3, Bluetooth, CloudSun, Database, Eye, Globe2, Layers, Navigation, PencilLine, Radio, Radar, Search, SlidersHorizontal, TowerControl, Menu, X, Compass, Tv, type LucideIcon } from "lucide-react";
import { SATELLITE_SOURCES, onSatelliteQuotaExceeded, type SatelliteImagerySource } from "./services/satellite-imagery";
import { fetchCellTowers, type CellTower } from "./services/cell-towers";
import StreetViewModal from "./StreetViewModal";
import {
  fetchEarthquakes,
  fetchConflicts,
  fetchCyberThreats,
  fetchNews as fetchGlobalNews,
  fetchFlights,
  POLL_INTERVALS,
  type GlobalConflictZone,
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
  ["Signals", Radar], ["Live Now", Radio], ["AI Brief", BarChart3], ["News", AlertTriangle], ["Markets", PencilLine],
  ["Aviation", SlidersHorizontal], ["Cameras", Search], ["Weather", CloudSun], ["Chokepoints", Bluetooth],
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
  { lon: 43.3, lat: 12.6, kind: "vessel", label: "Bab el-Mandeb", detail: "21 AIS vessels · risk 82" },
  { lon: 56.3, lat: 26.6, kind: "vessel", label: "Strait of Hormuz", detail: "39 AIS vessels · risk 64" },
  { lon: 32.3, lat: 30.5, kind: "vessel", label: "Suez Canal", detail: "46 AIS vessels · risk 58" },
  { lon: -79.7, lat: 9.1, kind: "vessel", label: "Panama Canal", detail: "31 AIS vessels · risk 41" },
  { lon: 100.4, lat: 2.5, kind: "vessel", label: "Strait of Malacca", detail: "118 AIS vessels · risk 24" },
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
const layerMarkerSamples: Record<string, GeoMarker[]> = {
  "Intelligence hotspots": [
    { lon: 77.2, lat: 28.6, kind: "conflict", label: "New Delhi intelligence hotspot", detail: "Political, economic, and security correlation" },
    { lon: 116.4, lat: 39.9, kind: "conflict", label: "Beijing intelligence hotspot", detail: "Regional posture and trade policy signals" },
  ],
  "Sanctions pressure": [
    { lon: -77.0, lat: 38.9, kind: "conflict", label: "Washington sanctions desk", detail: "Sanctions and policy pressure center" },
    { lon: 37.6, lat: 55.7, kind: "conflict", label: "Moscow sanctions desk", detail: "Energy, defence, and sanctions exposure" },
  ],
  "Earthquakes · USGS": [
    { lon: 142.0, lat: 38.3, kind: "hazard", mag: 5.7, label: "Honshu seismic event", detail: "USGS earthquake sample" },
    { lon: -117.5, lat: 35.8, kind: "hazard", mag: 4.2, label: "California seismic event", detail: "USGS earthquake sample" },
  ],
  "Wildfires · EONET": [
    { lon: -121.5, lat: 39.2, kind: "hazard", label: "California wildfire", detail: "NASA EONET fire sample" },
    { lon: 135.5, lat: -25.2, kind: "hazard", label: "Australian wildfire", detail: "NASA EONET fire sample" },
  ],
  "Weather alerts": [
    { lon: -97.0, lat: 38.0, kind: "hazard", label: "NWS severe weather", detail: "US public weather alerts sample" },
    { lon: 78.0, lat: 22.0, kind: "hazard", label: "India weather alert", detail: "Public weather alert sample" },
  ],
  "Protest clusters": [
    { lon: -74.0, lat: 40.7, kind: "conflict", label: "New York protest cluster", detail: "Public protest activity sample" },
    { lon: 2.35, lat: 48.86, kind: "conflict", label: "Paris protest cluster", detail: "Public protest activity sample" },
    { lon: 139.69, lat: 35.68, kind: "conflict", label: "Tokyo protest cluster", detail: "Public protest activity sample" },
  ],
  "Dark ships": [
    { lon: 18.5, lat: 35.0, kind: "vessel", label: "Dark ship signal · Mediterranean", detail: "AIS gap and route anomaly" },
    { lon: 121.5, lat: 21.5, kind: "vessel", label: "Dark ship signal · Taiwan Strait", detail: "AIS gap and route anomaly" },
  ],
  "Waterways": [
    { lon: 32.35, lat: 30.5, kind: "vessel", label: "Suez waterway", detail: "High-density commercial route" },
    { lon: 100.6, lat: 2.5, kind: "vessel", label: "Malacca waterway", detail: "High-density commercial route" },
    { lon: -79.7, lat: 9.1, kind: "vessel", label: "Panama waterway", detail: "High-density commercial route" },
  ],
  "Trade routes": [
    { lon: 9.0, lat: 36.0, kind: "vessel", label: "Europe-Asia trade route", detail: "Global shipping corridor" },
    { lon: 80.0, lat: 10.0, kind: "vessel", label: "Indian Ocean trade route", detail: "Global shipping corridor" },
    { lon: -35.0, lat: 15.0, kind: "vessel", label: "Atlantic trade route", detail: "Global shipping corridor" },
  ],
  "GPS jamming zones": [
    { lon: 37.6, lat: 55.7, kind: "hazard", label: "Eastern Europe GPS interference", detail: "Navigation interference sample" },
    { lon: 34.8, lat: 31.5, kind: "hazard", label: "Eastern Mediterranean GPS interference", detail: "Navigation interference sample" },
  ],
  "Internet outages": [
    { lon: 28.98, lat: 41.0, kind: "infra", label: "Istanbul network outage", detail: "Connectivity disruption sample" },
    { lon: 77.2, lat: 28.6, kind: "infra", label: "New Delhi network outage", detail: "Connectivity disruption sample" },
    { lon: 151.2, lat: -33.9, kind: "infra", label: "Sydney network outage", detail: "Connectivity disruption sample" },
  ],
  "Camera feeds": [
    { lon: 77.59, lat: 12.97, kind: "infra", label: "Bengaluru public camera", detail: "Public camera feed sample" },
    { lon: -0.12, lat: 51.5, kind: "infra", label: "London public camera", detail: "Public camera feed sample" },
    { lon: 139.7, lat: 35.68, kind: "infra", label: "Tokyo public camera", detail: "Public camera feed sample" },
  ],
  "Cell towers · OpenCellID": [
    { lon: 77.59, lat: 12.97, kind: "infra", label: "Bengaluru cell tower", detail: "OpenCellID coverage sample" },
    { lon: 72.88, lat: 19.07, kind: "infra", label: "Mumbai cell tower", detail: "OpenCellID coverage sample" },
  ],
};
const fallbackFlightMarkers: GeoMarker[] = [
  { lon: 77.6, lat: 13.0, kind: "flight", label: "6E 402", detail: "Commercial aircraft · sample position", heading: 72 },
  { lon: 2.35, lat: 48.86, kind: "flight", label: "AF 276", detail: "Commercial aircraft · sample position", heading: 110 },
  { lon: -73.78, lat: 40.64, kind: "flight", label: "UA 18", detail: "Commercial aircraft · sample position", heading: 250 },
  { lon: 37.62, lat: 55.75, kind: "flight", label: "MIL-01", detail: "Military aircraft · sample position", heading: 180 },
  { lon: 121.47, lat: 31.23, kind: "flight", label: "MIL-02", detail: "Military aircraft · sample position", heading: 315 },
];

const LAYER_BASELINES: Record<string, string> = {
  "Conflict events": "47",
  "Intelligence hotspots": "18",
  "Protest clusters": "23",
  "Sanctions pressure": "38",
  "Military bases": "52",
  "Nuclear facilities": "92",
  "Spaceports": "12",
  "Satellites · TLE": "1,334",
  "Critical minerals": "64",
  "Submarine cables": "421",
  "AI datacenters": "96",
  "Pipelines": "88",
  "Internet outages": "14",
  "Economic centers": "31",
  "Military flights": "329",
  "Commercial flights": "12,114",
  "GPS jamming zones": "12",
  "Vessels · AIS": "1,204",
  "Dark ships": "18",
  "Waterways": "19",
  "Trade routes": "19",
  "Earthquakes · USGS": "31",
  "Wildfires · EONET": "184",
  "Weather alerts": "220",
  "Canada alerts": "6",
  "Camera feeds": "38,421",
  "Cell towers · OpenCellID": "38",
};

const initialLayers: Layer[] = [
  { label: "Conflict events", count: LAYER_BASELINES["Conflict events"], active: true, kind: "conflict", group: "CONFLICT & SECURITY" },
  { label: "Intelligence hotspots", count: LAYER_BASELINES["Intelligence hotspots"], active: true, kind: "conflict", group: "CONFLICT & SECURITY" },
  { label: "Protest clusters", count: LAYER_BASELINES["Protest clusters"], active: true, kind: "conflict", group: "CONFLICT & SECURITY" },
  { label: "Sanctions pressure", count: LAYER_BASELINES["Sanctions pressure"], active: true, kind: "conflict", group: "CONFLICT & SECURITY" },
  { label: "Military bases", count: LAYER_BASELINES["Military bases"], active: true, kind: "base", group: "STRATEGIC ASSETS" },
  { label: "Nuclear facilities", count: LAYER_BASELINES["Nuclear facilities"], active: true, kind: "hazard", group: "STRATEGIC ASSETS" },
  { label: "Spaceports", count: LAYER_BASELINES["Spaceports"], active: false, kind: "base", group: "STRATEGIC ASSETS" },
  { label: "Satellites · TLE", count: LAYER_BASELINES["Satellites · TLE"], active: true, kind: "infra", group: "STRATEGIC ASSETS" },
  { label: "Critical minerals", count: LAYER_BASELINES["Critical minerals"], active: false, kind: "infra", group: "STRATEGIC ASSETS" },
  { label: "Submarine cables", count: LAYER_BASELINES["Submarine cables"], active: true, kind: "cable", group: "STRATEGIC ASSETS" },
  { label: "AI datacenters", count: LAYER_BASELINES["AI datacenters"], active: false, kind: "infra", group: "STRATEGIC ASSETS" },
  { label: "Pipelines", count: LAYER_BASELINES["Pipelines"], active: false, kind: "infra", group: "INFRASTRUCTURE" },
  { label: "Internet outages", count: LAYER_BASELINES["Internet outages"], active: true, kind: "infra", group: "INFRASTRUCTURE" },
  { label: "Economic centers", count: LAYER_BASELINES["Economic centers"], active: true, kind: "infra", group: "INFRASTRUCTURE" },
  { label: "Military flights", count: LAYER_BASELINES["Military flights"], active: true, kind: "flight", group: "AVIATION" },
  { label: "Commercial flights", count: LAYER_BASELINES["Commercial flights"], active: true, kind: "flight", group: "AVIATION" },
  { label: "GPS jamming zones", count: LAYER_BASELINES["GPS jamming zones"], active: false, kind: "flight", group: "AVIATION" },
  { label: "Vessels · AIS", count: LAYER_BASELINES["Vessels · AIS"], active: true, kind: "vessel", group: "MARITIME" },
  { label: "Dark ships", count: LAYER_BASELINES["Dark ships"], active: false, kind: "vessel", group: "MARITIME" },
  { label: "Waterways", count: LAYER_BASELINES["Waterways"], active: true, kind: "vessel", group: "MARITIME" },
  { label: "Trade routes", count: LAYER_BASELINES["Trade routes"], active: false, kind: "vessel", group: "MARITIME" },
  { label: "Earthquakes · USGS", count: LAYER_BASELINES["Earthquakes · USGS"], active: true, kind: "hazard", group: "CLIMATE & HAZARDS" },
  { label: "Wildfires · EONET", count: LAYER_BASELINES["Wildfires · EONET"], active: true, kind: "hazard", group: "CLIMATE & HAZARDS" },
  { label: "Weather alerts", count: LAYER_BASELINES["Weather alerts"], active: true, kind: "hazard", group: "CLIMATE & HAZARDS" },
  { label: "Canada alerts", count: LAYER_BASELINES["Canada alerts"], active: true, kind: "hazard", group: "CLIMATE & HAZARDS" },
  { label: "Camera feeds", count: LAYER_BASELINES["Camera feeds"], active: true, kind: "infra", group: "INFRASTRUCTURE" },
  { label: "Cell towers · OpenCellID", count: LAYER_BASELINES["Cell towers · OpenCellID"], active: false, kind: "infra", group: "INFRASTRUCTURE" },
];
const layerGroups = ["CONFLICT & SECURITY", "STRATEGIC ASSETS", "INFRASTRUCTURE", "AVIATION", "MARITIME", "CLIMATE & HAZARDS"];

const signals = [
  ["Red Sea transit risk rises after two verified incidents", "REUTERS + 4 ORIGINS", "03m", "critical"],
  ["AIS density falls below weekly range in Bab el-Mandeb", "AISSTREAM", "08m", "warning"],
  ["Magnitude 5.7 event detected east of Honshu", "USGS", "12m", "warning"],
  ["BGP anomaly observed across two regional networks", "RIPE ATLAS", "19m", "neutral"],
];
const markets = [
  ["S&P 500", "EQ", "5,428.61", "+0.42%", "up"], ["BTC / USD", "CRYPTO", "67,382", "−1.20%", "down"],
  ["BRENT", "ENERGY", "82.31", "+1.18%", "up"], ["GOLD", "METAL", "2,338.4", "+0.35%", "up"], ["EUR / USD", "FX", "1.0842", "−0.08%", "down"],
];
const chokepoints = [["Bab el-Mandeb", "21", 82], ["Strait of Hormuz", "39", 64], ["Suez Canal", "46", 58], ["Panama Canal", "31", 41], ["Strait of Malacca", "118", 24]];
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
  const [launched, setLaunched] = useState(false);
  const [layers, setLayers] = useState(initialLayers);
  const [tab, setTab] = useState("Signals");
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [lens, setLens] = useState("World");
  const [dossier, setDossier] = useState<EventMarker | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ marker: GeoMarker; satellite?: GlobalSatellite } | null>(null);
  const [command, setCommand] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [flat, setFlat] = useState(false);
  const [mapView, setMapView] = useState<"dark" | "satellite">("dark");
  const [satelliteEnabled, setSatelliteEnabled] = useState(false);
  const [satelliteSource, setSatelliteSource] = useState<SatelliteImagerySource>("sentinel-hub");
  const [satelliteQuotaNotice, setSatelliteQuotaNotice] = useState<string | null>(null);
  const [cellTowers, setCellTowers] = useState<CellTower[]>([]);
  const [selectedCellTower, setSelectedCellTower] = useState<CellTower | null>(null);
  const [streetViewMode, setStreetViewMode] = useState(false);
  const [streetViewTarget, setStreetViewTarget] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(1);
  const [mapTarget, setMapTarget] = useState<[number, number] | undefined>(undefined);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "live" | "denied">("idle");
  const [mobileDrawer, setMobileDrawer] = useState<"layers" | "intel" | "menu" | null>(null);
  const locationWatchRef = useRef<number | null>(null);
  const [earthquakes, setEarthquakes] = useState(31);
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
  const [openLayerCounts, setOpenLayerCounts] = useState<Record<string, number>>({});
  const [reliefCount, setReliefCount] = useState<number | null>(null);
  const [satellites, setSatellites] = useState<GlobalSatellite[]>([]);
  const [satelliteCount, setSatelliteCount] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState("7d");
  const [feedStatus, setFeedStatus] = useState<Record<string, "live" | "sample">>({
    "Conflict events": "sample", "Protest clusters": "sample", "GPS jamming zones": "sample",
    "Vessels · AIS": "sample", "Dark ships": "sample", "Submarine cables": "sample", "AI datacenters": "sample",
    "Military bases": "sample", "Earthquakes · USGS": "sample", "Wildfires · EONET": "sample", "Military flights": "sample",
    "Intelligence hotspots": "sample", "Sanctions pressure": "sample", "Nuclear facilities": "sample", "Spaceports": "sample",
    "Critical minerals": "sample", "Pipelines": "sample", "Internet outages": "sample", "Economic centers": "sample",
    "Waterways": "sample", "Trade routes": "sample", "Weather alerts": "sample", "Canada alerts": "sample", "Satellites · TLE": "sample",
    "Camera feeds": "sample", "Commercial flights": "sample"
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
  const [marketRows, setMarketRows] = useState(markets);
  const [marketQuery, setMarketQuery] = useState("");
  const [marketNews, setMarketNews] = useState<{ title: string; url: string; domain: string; time: string; imageUrl?: string }[]>([]);
  const [marketNewsState, setMarketNewsState] = useState<"idle" | "loading" | "ok" | "empty">("idle");
  const [marketSymbol, setMarketSymbol] = useState("S&P 500");
  const [weatherSnapshot, setWeatherSnapshot] = useState<WeatherSnapshot | null>(null);
  const [weatherState, setWeatherState] = useState<"idle" | "loading" | "live" | "error">("idle");
  const [refresh, setRefresh] = useState(0);
  const [showNewsPanel, setShowNewsPanel] = useState(false);
  const [showSatelliteViewer, setShowSatelliteViewer] = useState(false);
  const [globalConflicts, setGlobalConflicts] = useState<GlobalConflictZone[]>([]);
  const [globalConflictMarkers, setGlobalConflictMarkers] = useState<GeoMarker[]>([]);
  const [cyberThreats, setCyberThreats] = useState<GlobalCyberThreat[]>([]);
  const [cyberThreatLevel, setCyberThreatLevel] = useState<string>("—");
  const [globalNewsItems, setGlobalNewsItems] = useState<GlobalNewsItem[]>([]);
  const [globalCameras, setGlobalCameras] = useState<GlobalCamera[]>([]);
  const [cameraMarkers, setCameraMarkers] = useState<GeoMarker[]>([]);
  const [activeCamera, setActiveCamera] = useState<GlobalCamera | null>(null);
  const mark = (k: string, s: "live" | "sample") => setFeedStatus(p => (p[k] === s ? p : { ...p, [k]: s }));

  // Listen for Sentinel Hub or provider quota limit notices
  useEffect(() => {
    return onSatelliteQuotaExceeded((source, message) => {
      setSatelliteQuotaNotice(message);
    });
  }, []);

  const isCellTowersLayerActive = layers.some(l => l.label === "Cell towers · OpenCellID" && l.active);

  // Fetch cell towers for active region when layer is active
  useEffect(() => {
    if (!isCellTowersLayerActive) return;
    let active = true;
    const center = mapTarget || flightCenter || [77.42682, 23.1776];
    const bbox: [number, number, number, number] = [
      center[1] - 0.4,
      center[0] - 0.4,
      center[1] + 0.4,
      center[0] + 0.4,
    ];

    fetchCellTowers(bbox)
      .then(towers => {
        if (!active) return;
        setCellTowers(towers);
        mark("Cell towers · OpenCellID", "live");
      })
      .catch(err => {
        console.warn("Cell tower fetch error:", err);
      });

    return () => { active = false; };
  }, [isCellTowersLayerActive, flightCenter, mapTarget]);

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

    setLayers(old => {
      if (lens === "World") return initialLayers;

      const mapping: Record<string, string[]> = {
        Tech: ["AI datacenters", "Submarine cables", "Internet outages", "Spaceports", "Earthquakes · USGS", "Military bases"],
        Finance: ["Conflict events", "Sanctions pressure", "Economic centers", "Vessels · AIS", "AI datacenters"],
        Commodity: ["Vessels · AIS", "Waterways", "Trade routes", "Critical minerals", "Wildfires · EONET", "Earthquakes · USGS"],
        Energy: ["Pipelines", "Waterways", "Nuclear facilities", "Vessels · AIS", "Wildfires · EONET", "Earthquakes · USGS", "Conflict events"],
        Calm: ["Wildfires · EONET", "Earthquakes · USGS", "Weather alerts", "Canada alerts", "Military flights", "Protest clusters"]
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
        // Earthquakes via global proxy (normalised JSON)
        const quakeResult = fetchEarthquakes().then(({ data }) => {
          if (!live) return;
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
                detail: `M${q.magnitude.toFixed(1)} · D${q.depth}km · USGS via Global Proxy · ${new Date(q.time).toISOString().slice(11, 16)} UTC`,
              })),
          );
        }).catch(() => { if (live) mark("Earthquakes · USGS", "sample"); });

        // BTC market price (kept as direct call — not proxied by Global)
        const btcResult = fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true")
          .then(r => r.json())
          .then(coinData => {
            if (!live) return;
            const btc = coinData.bitcoin;
            if (btc?.usd) setMarketRows(rows => rows.map(row => row[0] === "BTC / USD" ? ["BTC / USD", "CRYPTO", Math.round(btc.usd).toLocaleString(), `${btc.usd_24h_change >= 0 ? "+" : ""}${Number(btc.usd_24h_change || 0).toFixed(2)}%`, btc.usd_24h_change >= 0 ? "up" : "down"] : row));
          }).catch(() => {});

        await Promise.allSettled([quakeResult, btcResult]);
      } catch { /* graceful fallback to sample data */ }
      if (live) setRefresh(n => n + 1);
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
        const { data } = await fetchConflicts();
        if (!live) return;
        setGlobalConflicts(data.zones);
        mark("Conflict events", "live");
        // Map conflict zones + live events to GeoMarkers
        const markers: GeoMarker[] = [];
        for (const zone of data.zones) {
          markers.push({
            lon: zone.lng, lat: zone.lat, kind: "conflict",
            label: zone.label,
            detail: `${zone.severity.toUpperCase()} · ${zone.eventCount} events · ${zone.description.slice(0, 60)}…`,
          });
          for (const ev of zone.events.slice(0, 3)) {
            markers.push({
              lon: ev.lng, lat: ev.lat, kind: "conflict",
              label: ev.title.slice(0, 50),
              detail: `${zone.label} · OSINT event`,
            });
          }
        }
        setGlobalConflictMarkers(markers);
      } catch { if (live) mark("Conflict events", "sample"); }
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
        const { data } = await fetchSatellites();
        if (!live) return;
        setSatellites(data.satellites);
        setSatelliteCount(data.total);
        mark("Satellites · TLE", "live");
      } catch { if (live) mark("Satellites · TLE", "sample"); }
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
      setCameraMarkers(result.cameras.map(c => ({ lon: c.lng, lat: c.lat, kind: "infra", label: c.name, detail: `${c.source} · ${c.stream_type}` })));
      setCameraStatus(`${result.cameras.length} published cameras. ${result.errors.join(' · ')}`);
      mark("Camera feeds", result.cameras.length ? "live" : "sample");
      setActiveCamera(current => current ? result.cameras.find(c => c.id === current.id) ?? current : null);
    };
    loadCameras();
    const interval = window.setInterval(loadCameras, 120000);
    return () => { live = false; controller.abort(); window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let live = true;
    const openQueries: Record<string, string> = {
      "Intelligence hotspots": "(crisis OR escalation OR clashes OR unrest OR emergency)",
      "Sanctions pressure": "(sanctions OR embargo OR asset freeze OR export controls)",
      "Internet outages": "(internet outage OR network disruption OR blackout OR telecom outage)",
      "Economic centers": "(central bank OR stock exchange OR inflation OR currency crisis)",
      "Pipelines": "(pipeline explosion OR pipeline outage OR oil pipeline OR gas pipeline)",
      "Waterways": "(strait OR canal OR chokepoint OR shipping lane)",
      "Trade routes": "(trade route OR shipping route OR supply chain disruption)",
      "Nuclear facilities": "(nuclear plant OR nuclear facility OR radiation alert)",
      "Critical minerals": "(lithium OR cobalt OR rare earth OR critical minerals)",
      "Canada alerts": "(Canada wildfire OR Canada weather alert OR Canada evacuation)",
    };
    const loadOpenLayerCounts = async () => {
      try {
        const entries = await Promise.all(Object.entries(openQueries).map(async ([layer, query]) => {
          const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query + " sourcelang:english")}&mode=artlist&maxrecords=20&sort=datedesc&format=json`;
          const res = await fetch(url);
          const data = await res.json();
          return [layer, Array.isArray(data?.articles) ? data.articles.length : 0] as const;
        }));
        if (!live) return;
        setOpenLayerCounts(Object.fromEntries(entries));
        entries.forEach(([layer, count]) => mark(layer, count > 0 ? "live" : "sample"));
      } catch {
        if (!live) return;
        Object.keys(openQueries).forEach(layer => mark(layer, "sample"));
      }
    };
    loadOpenLayerCounts();
    const interval = window.setInterval(loadOpenLayerCounts, 90000);
    return () => { live = false; window.clearInterval(interval); };
  }, []);
  useEffect(() => {
    let live = true;
    const loadReliefWeb = async () => {
      try {
        const res = await fetch("https://api.reliefweb.int/v1/reports?appname=vigil-dashboard&profile=list&preset=latest&limit=25");
        const data = await res.json();
        if (!live) return;
        const count = Array.isArray(data?.data) ? data.data.length : 0;
        setReliefCount(count);
        mark("Intelligence hotspots", count > 0 ? "live" : "sample");
      } catch {
        if (live) mark("Intelligence hotspots", "sample");
      }
    };
    loadReliefWeb();
    const interval = window.setInterval(loadReliefWeb, 120000);
    return () => { live = false; window.clearInterval(interval); };
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
          observedAt: Date.now(),
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
        setFlightMarkers(military.filter(f => withCoordinates.includes(f)).map(marker));
        setCommercialFlightMarkers(commercial.filter(f => withCoordinates.includes(f)).map(marker));
        setFlightStatus(`${data.source || 'Global flight API'} · ${withCoordinates.length || totalReported} current aircraft · updated ${new Date().toLocaleTimeString()}`);
        mark("Military flights", "live"); mark("Commercial flights", "live");
      } catch (e) {
        if (!live) return;
        const fallbackMilitary = fallbackFlightMarkers.filter(marker => marker.label.startsWith("MIL"));
        const fallbackCommercial = fallbackFlightMarkers.filter(marker => !marker.label.startsWith("MIL"));
        setFlightMarkers(fallbackMilitary);
        setCommercialFlightMarkers(fallbackCommercial);
        setFlightCount(fallbackFlightMarkers.length);
        setMilitaryFlightCount(fallbackMilitary.length);
        setCommercialFlightCount(fallbackCommercial.length);
        setFlightStatus(`${(e as Error).message} · retaining last known aircraft`); mark("Military flights", "sample"); mark("Commercial flights", "sample");
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
          published: article.published || new Date().toISOString(),
          source: article.source || "Verified news publisher",
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
            published: new Date().toISOString(),
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
        const res = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=200");
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
      } catch { mark("Wildfires · EONET", "sample"); }
    };
    loadFires();
    const interval = window.setInterval(loadFires, 60000);
    return () => { live = false; window.clearInterval(interval); };
  }, []);
  useEffect(() => {
    let live = true;
    const loadWeather = async () => {
      try {
        const res = await fetch("https://api.weather.gov/alerts/active?status=actual&message_type=alert");
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
      } catch { mark("Weather alerts", "sample"); }
    };
    loadWeather();
    const interval = window.setInterval(loadWeather, 60000);
    return () => { live = false; window.clearInterval(interval); };
  }, []);
  const on = useMemo(() => new Set(layers.filter(l => l.active).map(l => l.label)), [layers]);
  const globeMarkers = useMemo(() => {
    const out: GeoMarker[] = [];
    const addLayerMarkers = (label: string, liveMarkers: GeoMarker[], sampleLabel = label) => {
      const samples = layerMarkerSamples[sampleLabel] || [];
      out.push(...(liveMarkers.length ? liveMarkers : samples));
    };
    if (on.has("Conflict events")) out.push(...(globalConflictMarkers.length ? globalConflictMarkers : conflictPoints.slice(0, 4)));
    if (on.has("Intelligence hotspots")) addLayerMarkers("Intelligence hotspots", intelligencePoints.filter(p => p.label.includes("hotspot")));
    if (on.has("Protest clusters")) addLayerMarkers("Protest clusters", conflictPoints.slice(4));
    if (on.has("Sanctions pressure")) addLayerMarkers("Sanctions pressure", intelligencePoints.filter(p => p.label.includes("sanctions")));
    if (on.has("Earthquakes · USGS")) addLayerMarkers("Earthquakes · USGS", quakeMarkers);
    if (on.has("Wildfires · EONET")) addLayerMarkers("Wildfires · EONET", fireMarkers);
    if (on.has("Weather alerts")) addLayerMarkers("Weather alerts", weatherMarkers);
    if (on.has("Canada alerts")) out.push(...intelligencePoints.filter(p => p.label.includes("Canada")));
    if (on.has("Vessels · AIS")) out.push(...chokePoints);
    if (on.has("Dark ships")) addLayerMarkers("Dark ships", []);
    if (on.has("Waterways")) addLayerMarkers("Waterways", []);
    if (on.has("Trade routes")) addLayerMarkers("Trade routes", []);
    if (on.has("Military flights")) out.push(...(flightMarkers.length ? flightMarkers : fallbackFlightMarkers.filter(marker => marker.label.startsWith("MIL"))));
    if (on.has("Commercial flights")) out.push(...(commercialFlightMarkers.length ? commercialFlightMarkers : fallbackFlightMarkers.filter(marker => !marker.label.startsWith("MIL"))));
    if (on.has("Military bases")) out.push(...militaryBases);
    if (on.has("Nuclear facilities")) out.push(...strategicPoints.filter(p => p.label.includes("nuclear")));
    if (on.has("Spaceports")) out.push(...strategicPoints.filter(p => p.label.includes("Spaceport") || p.label.includes("ISRO") || p.label.includes("Cape")));
    if (on.has("Critical minerals")) out.push(...strategicPoints.filter(p => p.label.includes("coal") || p.label.includes("mineral")));
    if (on.has("Pipelines")) out.push(...infrastructurePoints.filter(p => p.label.includes("pipelines")));
    if (on.has("Internet outages")) addLayerMarkers("Internet outages", infrastructurePoints.filter(p => p.label.includes("internet")));
    if (on.has("Economic centers")) out.push(...infrastructurePoints.filter(p => p.label.includes("markets")));
    if (on.has("Submarine cables") || on.has("AI datacenters")) out.push(...infraPoints);
    if (on.has("Camera feeds")) addLayerMarkers("Camera feeds", cameraMarkers);
    if (on.has("GPS jamming zones")) addLayerMarkers("GPS jamming zones", []);
    if (on.has("Cell towers · OpenCellID")) addLayerMarkers("Cell towers · OpenCellID", cellTowers.map(t => ({ lon: t.lon, lat: t.lat, kind: "infra" as const, label: t.operator || "Cell tower", detail: `${t.radio} · OpenCellID` })));
    if (myLocation) out.push({ lon: myLocation[0], lat: myLocation[1], kind: "base", label: "My live location", detail: "Browser GPS position · live location marker" });
    return out;
  }, [on, quakeMarkers, flightMarkers, commercialFlightMarkers, fireMarkers, weatherMarkers, globalConflictMarkers, cameraMarkers, myLocation]);
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
    const hotHeadline = news[0]?.title || "Global feeds are initializing; sample intelligence remains active.";
    const risk = Math.min(96, 48 + on.size * 2 + Math.round((earthquakes + (fireCount || 0) + (weatherCount || 0)) / 12));
    const posture = risk > 78 ? "HIGH WATCH" : risk > 62 ? "ELEVATED" : "STABLE WATCH";
    return [
      { label: "Posture", value: posture, detail: `${risk}/100 composite from active layers, hazards, and live headlines.` },
      { label: "Top driver", value: hotHeadline, detail: `${newsState === "ok" ? "Live GDELT headline" : "Fallback brief"} · ${timeRange} scope.` },
      { label: "India lens", value: "Keep India desk pinned", detail: "India channels, ports, weather, security, and satellite assets are prioritized by default." },
      { label: "Convergence", value: "Maritime + weather + sanctions", detail: "Watch chokepoints when commodity and energy lenses are active together." },
    ];
  }, [earthquakes, fireCount, news, newsState, on.size, timeRange, weatherCount]);
  const toggle = (label: string) => setLayers(old => old.map(l => l.label === label ? { ...l, active: !l.active } : l));
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
        setMapView("satellite");
        setFlat(false);
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
    setMapView("satellite");
    setFlat(false);
    setZoom(3);
  };
  const decorate = (l: Layer): Layer => {
    const fallback = LAYER_BASELINES[l.label] || l.count || "12";
    let liveCount: string | null = null;

    if (l.label === "Conflict events" && globalConflicts.length > 0) {
      liveCount = String(globalConflicts.length);
    } else if (l.label === "Camera feeds") {
      if (globalCameras.length > 0) liveCount = globalCameras.length.toLocaleString();
      else if (cameraMarkers.length > 0) liveCount = cameraMarkers.length.toLocaleString();
    } else if (l.label === "Earthquakes · USGS") {
      if (earthquakes > 0) liveCount = earthquakes.toString();
    } else if (l.label === "Wildfires · EONET" && fireCount != null && fireCount > 0) {
      liveCount = fireCount.toString();
    } else if (l.label === "Weather alerts" && weatherCount != null && weatherCount > 0) {
      liveCount = weatherCount.toString();
    } else if (l.label === "Military flights" && reportedFlightCounts && reportedFlightCounts.military > 0) {
      liveCount = reportedFlightCounts.military.toLocaleString();
    } else if (l.label === "Commercial flights" && reportedFlightCounts && reportedFlightCounts.commercial > 0) {
      liveCount = reportedFlightCounts.commercial.toLocaleString();
    } else if (l.label === "Intelligence hotspots" && reliefCount != null && reliefCount > 0) {
      liveCount = String(reliefCount + (openLayerCounts[l.label] || 0));
    } else if (l.label === "Satellites · TLE" && satelliteCount != null && satelliteCount > 0) {
      liveCount = satelliteCount.toLocaleString();
    } else if (l.label === "Cell towers · OpenCellID" && cellTowers.length > 0) {
      liveCount = cellTowers.length.toString();
    } else if (openLayerCounts[l.label] != null && openLayerCounts[l.label] > 0) {
      liveCount = String(openLayerCounts[l.label]);
    }

    const finalCount = (liveCount && liveCount !== "0") ? liveCount : fallback;
    return { ...l, count: finalCount };
  };
  if (!launched) return <VigilHero onLaunch={() => setLaunched(true)} clock={clock} />;

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><img src={vigilLogo} alt="VIGIL" /><span>VIGIL</span></div>
      <div className="lenses">{["World", "Tech", "Finance", "Commodity", "Energy", "Calm"].map(x => <button onClick={() => setLens(x)} className={lens === x ? "active" : ""} key={x}>{x}</button>)}</div>
      <button className="command-trigger" onClick={() => setCommand(true)}><kbd>⌘K</kbd> Search commands, countries, layers…</button>
      <div className="top-actions">
        <button onClick={() => setShowNewsPanel(!showNewsPanel)} className="icon-btn news-btn" title="Global News Channels">
          🌍 News
        </button>
        <button onClick={() => setShowSatelliteViewer(!showSatelliteViewer)} className="icon-btn satellite-btn" title="Satellite Tracker">
          🛰️ Satellites
        </button>
        <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} className="theme-toggle" aria-label="Toggle theme">
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>
        <span className="clock">UTC {clock.toISOString().slice(11, 19)}</span>
        <span className="live"><i /> LIVE</span>
        <button className="icon-btn">♢<b>3</b></button>
        <button className="avatar">A</button>
      </div>
      <div className="mobile-header-actions">
        <button className="mobile-search-btn" onClick={() => setCommand(true)} aria-label="Search">
          <Search size={16} />
        </button>
        <button
          className={`mobile-menu-btn ${mobileDrawer === "menu" ? "active" : ""}`}
          onClick={() => setMobileDrawer(d => d === "menu" ? null : "menu")}
          aria-label="Toggle mobile menu"
        >
          {mobileDrawer === "menu" ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
    </header>
    <section className={`workspace ${rightPanelOpen ? "right-panel-expanded" : "right-panel-rail"}`}>
      <aside className={`left-panel panel ${mobileDrawer === "layers" ? "mobile-open" : ""}`}>
        <div className="mobile-panel-header">
          <div className="mobile-panel-title">
            <Layers size={14} />
            <span>MAP LAYERS & SATELLITE</span>
          </div>
          <button className="mobile-panel-close-btn" onClick={() => setMobileDrawer(null)} aria-label="Close layers">
            <X size={16} />
          </button>
        </div>
        <div className="panel-title layer-panel-head"><span>MAP LAYERS</span><button onClick={selectAllLayers}>{on.size === layers.length ? "DESELECT ALL" : "SELECT ALL"}</button><small>{on.size} / {layers.length} ON</small></div>
        <button className="location-button" onClick={pinMyLocation}>{locationStatus === "live" ? "⌖ RECENTER ON MY LOCATION" : locationStatus === "locating" ? "⌖ LOCATING..." : locationStatus === "denied" ? "⌖ LOCATION UNAVAILABLE" : "⌖ PIN MY LOCATION"}</button>

        {/* SATELLITE IMAGERY CONTROL CARD (OFF BY DEFAULT) */}
        <div className="satellite-control-card">
          <div className="satellite-control-header">
            <div className="satellite-control-title">
              <Globe2 size={13} />
              <span>SATELLITE IMAGERY</span>
            </div>
            <button
              className={`toggle ${satelliteEnabled ? "on" : ""}`}
              onClick={() => {
                const next = !satelliteEnabled;
                setSatelliteEnabled(next);
                if (next && !satelliteSource) {
                  setSatelliteSource("sentinel-hub");
                }
              }}
              aria-label="Toggle satellite imagery overlay"
            >
              <i />
            </button>
          </div>

          {satelliteEnabled && (
            <div className="satellite-source-selector">
              <span className="satellite-source-label">Select Imagery Source:</span>
              <div className="satellite-source-options">
                {(
                  [
                    ["sentinel-hub", "Sentinel Hub", "Process API"],
                    ["copernicus", "Copernicus Data Space", "ESA Official"],
                    ["aws-sentinel", "AWS Open Data (S2)", "Public S3"],
                    ["landsat", "Landsat (NASA/USGS)", "15-30m ARD"],
                  ] as const
                ).map(([srcId, label, badge]) => (
                  <button
                    key={srcId}
                    className={`satellite-source-btn ${satelliteSource === srcId ? "active" : ""}`}
                    onClick={() => {
                      setSatelliteSource(srcId);
                      setSatelliteQuotaNotice(null);
                    }}
                  >
                    <span>{label}</span>
                    <span className="satellite-source-badge">{badge}</span>
                  </button>
                ))}
              </div>

              <div className="satellite-source-specs">
                <div><span>Provider:</span><strong>{SATELLITE_SOURCES[satelliteSource].provider}</strong></div>
                <div><span>Resolution:</span><strong>{SATELLITE_SOURCES[satelliteSource].resolution}</strong></div>
                <div><span>Revisit:</span><strong>{SATELLITE_SOURCES[satelliteSource].revisitDays}</strong></div>
              </div>

              {satelliteQuotaNotice && (
                <div className="satellite-quota-banner">
                  <span className="satellite-quota-banner-text">
                    ⚠️ {satelliteQuotaNotice}
                  </span>
                  <button
                    className="satellite-quota-switch-btn"
                    onClick={() => {
                      setSatelliteSource("copernicus");
                      setSatelliteQuotaNotice(null);
                    }}
                  >
                    Switch to Copernicus (No Cap) →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {layerGroups.map(g => <div key={g}>
          <p className="group-label">{g}</p>
          {layers.filter(l => l.group === g).map(l => <LayerRow key={l.label} layer={decorate(l)} status={feedStatus[l.label]} onToggle={() => toggle(l.label)} />)}
        </div>)}
        <button className="location-button" onClick={() => openTab("Aviation")}>SEARCH FLIGHTS</button><button className="location-button" onClick={() => openTab("Cameras")}>EXPLORE PUBLIC CAMERAS</button><div className="legend"><span><i className="dot red" /> Critical</span><span><i className="dot gold" /> Elevated</span><span><i className="dot green" /> Stable</span><span>Aircraft color: altitude</span></div>
      </aside>
      <section className="map-zone">
        <div className="map-toolbar">
          <div>
            <span className="eyebrow">GLOBAL OPERATING PICTURE · {globeMarkers.length} PLOTTED</span>
            <strong>AS OF {clock.toISOString().slice(11, 19)} UTC · {flat ? "2D MERCATOR" : "3D GLOBE"} · {timeRange}</strong>
          </div>
          <div className="map-tools">
            {["1h", "6h", "24h", "48h", "7d"].map(range => (
              <button key={range} className={timeRange === range ? "active" : ""} onClick={() => setTimeRange(range)}>{range}</button>
            ))}
            <button
              className={satelliteEnabled ? "active" : ""}
              onClick={() => {
                const next = !satelliteEnabled;
                setSatelliteEnabled(next);
                if (next) setFlat(true);
              }}
              title="Toggle Satellite Imagery Overlay"
            >
              ▧ {satelliteEnabled ? `Satellite (${SATELLITE_SOURCES[satelliteSource].badge})` : "Satellite"}
            </button>
            <button
              className={streetViewMode ? "active" : ""}
              onClick={() => {
                setStreetViewTarget(flightCenter || [77.42682, 23.1776]);
                setStreetViewMode(false);
              }}
              title="Open Street View at the current map center"
            >
              <Navigation size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: 3 }} />
              Street View 360°
            </button>
            <button className={!flat ? "active" : ""} onClick={() => setFlat(false)}>◎ 3D Globe</button>
            <button className={flat ? "active" : ""} onClick={() => setFlat(true)}>◫ 2D Map</button>
            <button onClick={() => setZoom(z => Math.max(0.6, +(z - 0.2).toFixed(2)))} aria-label="Zoom out">−</button>
            <button onClick={() => setZoom(z => Math.min(5, +(z + 0.2).toFixed(2)))} aria-label="Zoom in">+</button>
          </div>
        </div>

        {/* Street View Mode Active Banner */}
        {streetViewMode && (
          <div className="streetview-mode-banner">
            <span>👁 STREET VIEW MODE ACTIVE — Click anywhere on the globe or city to open 360° ground imagery</span>
            <button
              onClick={() => {
                setStreetViewTarget(flightCenter || [77.42682, 23.1776]);
                setStreetViewMode(false);
              }}
              style={{ background: "#0284c7", border: "none", color: "#fff", borderRadius: 3, padding: "2px 8px", cursor: "pointer", fontSize: 10, fontWeight: 600 }}
            >
              Open Center ↗
            </button>
            <button className="streetview-mode-close-btn" onClick={() => setStreetViewMode(false)}>Exit</button>
          </div>
        )}

        {/* Active Satellite Imagery Attribution Pill */}
        {satelliteEnabled && (
          <div className="satellite-attribution-pill">
            <strong>{SATELLITE_SOURCES[satelliteSource].badge}</strong>
            <span>{SATELLITE_SOURCES[satelliteSource].attribution}</span>
          </div>
        )}

        <div className={flat ? "world-map flat" : "world-map"}>
          <Globe
            onMapCenter={center => setFlightCenter(previous => Math.abs(previous[0] - center[0]) + Math.abs(previous[1] - center[1]) > 0.1 ? center : previous)}
            markers={globeMarkers}
            satellites={on.has("Satellites · TLE") ? satellites : []}
            flat={flat}
            zoom={zoom}
            target={mapTarget}
            mapView={mapView}
            satelliteEnabled={satelliteEnabled}
            satelliteSource={satelliteSource}
            cellTowers={cellTowers}
            cellTowersEnabled={on.has("Cell towers · OpenCellID")}
            onSelectCellTower={setSelectedCellTower}
            streetViewMode={streetViewMode}
            onStreetViewClick={coords => {
              setStreetViewTarget(coords);
              setStreetViewMode(false);
            }}
            onSelect={(marker, satellite) => {
              if (marker.flight) { setSelectedAircraft(marker.flight); return; }
              const cam = globalCameras.find(c => c.name === marker.label);
              if (cam) {
                setActiveCamera(cam);
                return;
              }
              const event = conflictPoints.find(e => e.label === marker.label);
              if (event) {
                setDossier(event);
                return;
              }
              setSelectedPoint({ marker, satellite });
            }}
          />
        </div>
        {!rightPanelOpen && <nav className="floating-option-rail" aria-label="Dashboard options">{rightPanelOptions.map(([label, Icon]) => <button key={label} title={label} aria-label={label} onClick={() => openTab(label)} className={tab === label ? "active" : ""}><Icon size={19} strokeWidth={1.6} /></button>)}</nav>}
        {showLiveMapFeed && <div className="live-map-feed overlay"><div className="panel-title"><span>LIVE NOW</span><div className="live-map-feed-actions"><small className={liveNowState === "live" ? "feed live" : "feed sample"}>{liveNowState === "live" ? "LIVE FEEDS" : liveNowState.toUpperCase()}</small><button onClick={() => setShowLiveMapFeed(false)} aria-label="Close live news column">×</button></div></div>{liveNowItems.slice(0, 5).map(item => {
          const isVideo = /youtube|youtu\.be|vimeo|video/i.test(item.link || "");
          return <a className="live-map-feed-item" key={item.id} href={item.link} target="_blank" rel="noreferrer">{item.image_url ? <img src={item.image_url} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = "none"; }} /> : <span className="news-thumb-placeholder">NEWS</span>}<div><strong>{item.title}</strong><span>{isVideo ? "VIDEO" : item.source} · {new Date(item.published).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div></a>;
        })}{liveNowItems.length === 0 && <p className="live-map-empty">Waiting for current events…</p>}</div>}
        {!showLiveMapFeed && <button className="live-map-feed-restore overlay" onClick={() => setShowLiveMapFeed(true)}>LIVE NOW</button>}
        <div className="map-count overlay"><span className="live"><i /> {(globeMarkers.length + earthquakes + (flightCount ?? 0)).toLocaleString()} SIGNALS</span><small>LIVE INGEST · GOOGLE NEWS · USGS · NWS · NASA · ADS-B</small></div>
        <div className="alert-ticker"><span>BREAKING</span><div>⚠ 4 origins corroborate increased disruption near Bab el-Mandeb <b>·</b> USGS M5.7 east of Honshu <b>·</b> Elevated GPS interference across eastern Mediterranean</div></div>
      </section>
      <aside className={`right-panel panel ${rightPanelOpen ? "open" : "collapsed"} ${mobileDrawer === "intel" ? "mobile-open" : ""}`}>
        <div className="mobile-panel-header">
          <div className="mobile-panel-title">
            <Radar size={14} />
            <span>GLOBAL INTEL & FEEDS</span>
          </div>
          <button className="mobile-panel-close-btn" onClick={() => { setRightPanelOpen(false); setMobileDrawer(null); }} aria-label="Close intel">
            <X size={16} />
          </button>
        </div>
        <nav className="side-tabs">{rightPanelOptions.map(([label, Icon]) => <button key={label} title={label} aria-label={label} onClick={() => openTab(label)} className={tab === label ? "active" : ""}><span aria-hidden="true"><Icon size={18} strokeWidth={1.6} /></span><b>{label}</b></button>)}</nav>
        <div className="right-panel-content">
        <div className="selected-panel-header"><div>{(() => { const [, SelectedIcon] = rightPanelOptions.find(([label]) => label === tab) || rightPanelOptions[0]; return <SelectedIcon size={17} strokeWidth={1.7} />; })()}<strong>{tab}</strong></div><button onClick={() => { setRightPanelOpen(false); setMobileDrawer(null); }} aria-label="Close selected option">×</button></div>
        {tab === "Signals" && <><div className="section-head"><span>TOP SIGNALS</span><small>Fewer alerts. Real ones.</small></div>{signals.map(s => <article className="signal" key={s[0]}><i className={s[3]} /><div><h3>{s[0]}</h3><p>{s[1]} <b>·</b> {s[2]}</p></div></article>)}<div className="correlation"><p>AI CORRELATION ENGINE</p><h3>RISK + FLOW + MACRO</h3><span>Red Sea disruption is repricing shipping risk; Brent response remains contained while passage volume recovers.</span><button>Open evidence →</button></div></>}
        {tab === "Live Now" && <div className="live-now-panel"><div className="section-head"><span>LIVE NOW · GOOGLE NEWS & VERIFIED</span><small className={liveNowState === "live" ? "feed live" : "feed sample"}>{liveNowState === "live" ? "REFRESHING EVERY 90S" : liveNowState === "loading" ? "LOADING" : "FALLBACK DATA"}</small></div><form className="live-news-filters" onSubmit={event => { event.preventDefault(); setLiveNewsSearch(liveNewsSearch.trim()); }}><input value={liveNewsSearch} onChange={event => setLiveNewsSearch(event.target.value)} placeholder="Search global news..." aria-label="Search live global news" /><select value={liveNewsCountry} onChange={event => setLiveNewsCountry(event.target.value)} aria-label="Filter news by country"><option value="WORLD">World</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="IN">India</option><option value="CA">Canada</option><option value="AU">Australia</option><option value="DE">Germany</option><option value="FR">France</option><option value="JP">Japan</option><option value="BR">Brazil</option><option value="ZA">South Africa</option></select><button type="submit">SEARCH</button></form><p className="news-scope">Free global news index · {liveNewsCountry === "WORLD" ? "all countries" : liveNewsCountry} · newest monitored reports first</p>{liveNowItems.length === 0 && <p className="news-empty">{liveNowState === "loading" ? "Loading trusted global news…" : "No matching reports found."}</p>}{liveNowItems.map(item => <a className="newsitem live-now-item" key={item.id} href={item.link} target="_blank" rel="noreferrer">{item.image_url ? <img className="live-news-thumb" src={item.image_url} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = "none"; }} /> : <span className="live-news-thumb news-thumb-placeholder">NEWS</span>}<div><h3>{item.title}</h3><p>{item.source} <b>·</b> {new Date(item.published).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div></a>)}</div>}
        {tab === "AI Brief" && <><div className="section-head"><span>AI INSIGHTS</span><small className={newsState === "ok" ? "feed live" : "feed sample"}>{newsState === "ok" ? "LIVE INPUTS" : "SAMPLE INPUTS"}</small></div>{aiInsights.map(item => <article className="ai-insight" key={item.label}><small>{item.label}</small><h3>{item.value}</h3><p>{item.detail}</p></article>)}<div className="open-source-panel"><p>FREE OPEN SOURCES</p>{openSources.map(source => <div key={source[0]}><strong>{source[0]}</strong><span>{source[1]}</span></div>)}</div><div className="correlation"><p>COUNTRY BRIEFING MODEL</p><h3>NEWS + LAYERS + MARKETS</h3><span>This is a browser-side intelligence synthesis using active map layers and current feed state. Connect a server LLM later for sourced long-form briefs.</span></div></>}
        {tab === "Markets" && <div className="markets-workspace"><form className="market-search" onSubmit={e => { e.preventDefault(); setMarketQuery(marketQuery.trim()); }}><input value={marketQuery} onChange={e => setMarketQuery(e.target.value)} placeholder="Search market impact…" aria-label="Search market impact" /><button type="submit">SEARCH</button></form><div className="market-summary">UP <b>7 / 11</b><span>BEST <b>CU +1.5%</b></span></div><div className="market-chart-head"><span>{marketSymbol} · INTRADAY</span><small>LIVE INDICATIVE</small></div><MarketChart positive={marketSymbol !== "EUR / USD"} />{marketRows.map(m => <button className="market" key={m[0]} onClick={() => setMarketSymbol(m[0])}><div><strong>{m[0]}</strong><small>{m[1]}</small></div><b className="ticking" key={`${m[0]}-${refresh}`}>{m[2]}</b><em className={m[4]}>{m[3]}</em><Spark up={m[4] === "up"} /></button>)}<div className="market-impact"><div className="section-head"><span>MARKET IMPACT</span><small>{marketNewsState === "loading" ? "SEARCHING" : marketNewsState === "ok" ? "LIVE FEEDS" : "READY"}</small></div>{marketNews.length ? marketNews.map(item => <a className="market-news market-news-with-thumb" key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.imageUrl && <img className="market-news-thumb" src={item.imageUrl} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = "none"; }} />}<div><strong>{item.title}</strong><small>{item.domain} · {item.time}</small></div></a>) : <p>{marketNewsState === "empty" ? "No matching market headlines found." : "Search a company, index, commodity, or country to see live impact."}</p>}</div></div>}
        {tab === "Aviation" && <FlightPanel flights={aircraft} status={flightStatus} reportedCounts={reportedFlightCounts} onSelect={setSelectedAircraft} />}
        {tab === "Cameras" && <CameraPanel cameras={globalCameras} status={cameraStatus} onSelect={setActiveCamera} />}
        {tab === "Weather" && <WeatherPanel snapshot={weatherSnapshot} state={weatherState} />}
        {tab === "Chokepoints" && <><div className="section-head"><span>MARITIME CHOKEPOINTS</span><small>13 TRACKED</small></div>{chokepoints.map(c => <div className="choke" key={c[0]}><div><strong>{c[0]}</strong><small>{c[1]} AIS VESSELS</small></div><b>{c[2]}</b><div className="riskbar"><i style={{ width: `${c[2]}%` }} /></div></div>)}</>}
        {tab === "News" && <><div className="news-tab-head"><div className="section-head"><span>LIVE NEWS · GOOGLE NEWS & VERIFIED</span><small className={newsState === "ok" ? "feed live" : "feed sample"}>{newsState === "ok" ? "LIVE" : newsState === "loading" ? "…" : "FALLBACK"}</small></div><form className="global-news-search" onSubmit={event => { event.preventDefault(); setNewsSearch(newsSearch.trim()); }}><input value={newsSearch} onChange={event => setNewsSearch(event.target.value)} placeholder="Search Google News & global feeds..." aria-label="Search worldwide news" /><button type="submit">SEARCH</button>{newsSearch && <button type="button" onClick={() => setNewsSearch("")} aria-label="Clear worldwide news search">×</button>}</form></div><p className="news-scope">SCOPE {newsQuery} · WORLDWIDE SOURCES</p>{news.length === 0 && <p className="news-empty">{newsState === "loading" ? "Scanning Google News & verified sources…" : "No live articles for this scope right now."}</p>}{news.map(n => <a className="newsitem newsitem-with-thumb" key={n.id || n.url} href={n.url} target="_blank" rel="noreferrer">{n.imageUrl ? <img className="newsitem-thumb" src={n.imageUrl} alt="" loading="lazy" onError={event => { const target = event.currentTarget; if (n.sourceDomain && !target.src.includes("gstatic.com")) { target.src = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${n.sourceDomain}&size=128`; } else { target.style.display = "none"; } }} /> : <span className="newsitem-thumb news-thumb-placeholder">NEWS</span>}<div className="newsitem-body"><h3>{n.title}</h3><p>{n.source || n.sourceDomain} <b>·</b> {n.time}</p></div></a>)}</>}

        <div style={{ marginTop: '20px', borderTop: '1px solid var(--bronze)', paddingTop: '10px' }}>
          <LiveTV channel={channel} setChannel={setChannel} lens={lens} />
        </div>
        </div>
      </aside>
    </section>
    {mobileDrawer && (
      <div className="mobile-backdrop" onClick={() => setMobileDrawer(null)} />
    )}

    {mobileDrawer === "menu" && (
      <div className="mobile-options-sheet">
        <div className="mobile-options-header">
          <div className="brand"><img src={vigilLogo} alt="VIGIL" /><span>VIGIL MENU</span></div>
          <button className="mobile-panel-close-btn" onClick={() => setMobileDrawer(null)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <div className="mobile-options-body">
          <div className="mobile-options-section">
            <span className="mobile-options-label">INTELLIGENCE LENS</span>
            <div className="mobile-lenses-grid">
              {["World", "Tech", "Finance", "Commodity", "Energy", "Calm"].map(x => (
                <button
                  key={x}
                  onClick={() => { setLens(x); setMobileDrawer(null); }}
                  className={`mobile-lens-btn ${lens === x ? "active" : ""}`}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>

          <div className="mobile-options-section">
            <span className="mobile-options-label">QUICK LAUNCH & TOOLS</span>
            <div className="mobile-tools-grid">
              <button
                className="mobile-tool-btn"
                onClick={() => { setShowNewsPanel(true); setMobileDrawer(null); }}
              >
                <span className="mobile-tool-icon">🌍</span>
                <div>
                  <strong>Global News Desk</strong>
                  <small>Multilingual live channels</small>
                </div>
              </button>
              <button
                className="mobile-tool-btn"
                onClick={() => { setShowSatelliteViewer(true); setMobileDrawer(null); }}
              >
                <span className="mobile-tool-icon">🛰️</span>
                <div>
                  <strong>Satellites Tracker</strong>
                  <small>TLE orbit visualizer</small>
                </div>
              </button>
              <button
                className={`mobile-tool-btn ${streetViewMode ? "active" : ""}`}
                onClick={() => {
                  setStreetViewTarget(flightCenter || [77.42682, 23.1776]);
                  setStreetViewMode(false);
                  setMobileDrawer(null);
                }}
              >
                <span className="mobile-tool-icon"><Navigation size={15} /></span>
                <div>
                  <strong>360° Street View</strong>
                  <small>Open current map center</small>
                </div>
              </button>
              <button
                className="mobile-tool-btn"
                onClick={() => { setCommand(true); setMobileDrawer(null); }}
              >
                <span className="mobile-tool-icon"><Search size={15} /></span>
                <div>
                  <strong>Command & Search</strong>
                  <small>Hotspots, bases, layers</small>
                </div>
              </button>
            </div>
          </div>

          <div className="mobile-options-section">
            <span className="mobile-options-label">MAP VIEW & THEME</span>
            <div className="mobile-settings-row">
              <button
                className={`mobile-setting-btn ${!flat ? "active" : ""}`}
                onClick={() => { setFlat(false); setMobileDrawer(null); }}
              >
                ◎ 3D Globe
              </button>
              <button
                className={`mobile-setting-btn ${flat ? "active" : ""}`}
                onClick={() => { setFlat(true); setMobileDrawer(null); }}
              >
                ◫ 2D Mercator
              </button>
              <button
                className="mobile-setting-btn"
                onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
              </button>
            </div>
          </div>

          <div className="mobile-options-section">
            <span className="mobile-options-label">LIVE BROADCAST</span>
            <LiveTV channel={channel} setChannel={setChannel} lens={lens} />
          </div>
        </div>
      </div>
    )}

    <nav className="mobile-bottom-dock" aria-label="Mobile Navigation">
      <button
        className={`mobile-dock-btn ${mobileDrawer === "layers" ? "active" : ""}`}
        onClick={() => setMobileDrawer(d => d === "layers" ? null : "layers")}
      >
        <Layers size={18} />
        <span>Layers</span>
        {satelliteEnabled && <span className="dock-badge-dot" />}
      </button>

      <button
        className={`mobile-dock-btn ${mobileDrawer === "intel" ? "active" : ""}`}
        onClick={() => {
          setRightPanelOpen(true);
          setMobileDrawer(d => d === "intel" ? null : "intel");
        }}
      >
        <Radar size={18} />
        <span>Intel</span>
      </button>

      <button
        className={`mobile-dock-btn ${streetViewMode ? "active" : ""}`}
        onClick={() => {
          setStreetViewMode(m => !m);
          setMobileDrawer(null);
        }}
      >
        <Navigation size={18} />
        <span>360°</span>
      </button>

      <button
        className={`mobile-dock-btn ${showNewsPanel ? "active" : ""}`}
        onClick={() => {
          setShowNewsPanel(true);
          setMobileDrawer(null);
        }}
      >
        <AlertTriangle size={18} />
        <span>News</span>
      </button>

      <button
        className={`mobile-dock-btn ${mobileDrawer === "menu" ? "active" : ""}`}
        onClick={() => setMobileDrawer(d => d === "menu" ? null : "menu")}
      >
        <Menu size={18} />
        <span>Menu</span>
      </button>
    </nav>

    <footer><span><i /> CONNECTED · STREAM SYNCHRONIZED</span><span>7 INDEPENDENT ALERT ORIGINS · NO SIGNUP · LOADS IN SECONDS</span><span>◌ DATA: GLOBAL PROXY · USGS · GDELT · ADS-B · AISSTREAM · CISA</span></footer>
    {dossier && <EventPanel event={dossier} onClose={() => setDossier(null)} />}
    {selectedAircraft && <AircraftDossier key={selectedAircraft.icao24} flight={selectedAircraft} onClose={() => setSelectedAircraft(null)} onLocate={f => { if (hasPosition(f)) { setMapTarget([f.lng, f.lat]); setZoom(2); } }} />}
    {selectedPoint && <PointDialog point={selectedPoint.marker} satellite={selectedPoint.satellite} news={news} onClose={() => setSelectedPoint(null)} />}
    {command && <Command onClose={() => setCommand(false)} onCountry={(x, lat, lng) => { 
      if (lat !== undefined && lng !== undefined) {
        setFlat(false);
        setMapTarget([lng, lat]);
        setCommand(false);
        return;
      }
      const event = conflictPoints.find(e => e.label === x);
      if (event) { setDossier(event); setCommand(false); }
    }} />}
    {showNewsPanel && <div className="modal-overlay"><NewsPanel onClose={() => setShowNewsPanel(false)} /></div>}
    {showSatelliteViewer && <div className="modal-overlay"><SatelliteViewer onClose={() => setShowSatelliteViewer(false)} /></div>}
    {activeCamera && <CameraViewer camera={activeCamera} onClose={() => setActiveCamera(null)} onLocate={(lat, lng) => {
      setMapTarget([lng, lat]);
      setActiveCamera(null);
      setFlat(false);
      setZoom(2);
    }} />}
    {selectedCellTower && (
      <div className="celltower-inspector-modal">
        <div className="celltower-inspector-header">
          <div>
            <h3>{selectedCellTower.operator}</h3>
            <span className={`celltower-tech-badge ${selectedCellTower.radio === "5G NR" ? "nr5g" : selectedCellTower.radio === "LTE" ? "lte" : "umts"}`}>
              {selectedCellTower.radio} TOWER
            </span>
          </div>
          <button onClick={() => setSelectedCellTower(null)} style={{ background: "none", border: "none", color: "#8f8573", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <p style={{ margin: "4px 0 8px", fontSize: 11, color: "#9c9281" }}>
          Source: {selectedCellTower.source} · Signal Range: ~{(selectedCellTower.rangeMeters / 1000).toFixed(1)} km
        </p>
        <div className="celltower-specs-grid">
          <div className="celltower-specs-item"><small>Tower ID</small><strong>{selectedCellTower.id}</strong></div>
          <div className="celltower-specs-item"><small>Cell ID / LAC</small><strong>{selectedCellTower.cellId} / {selectedCellTower.lac}</strong></div>
          <div className="celltower-specs-item"><small>MCC / MNC</small><strong>{selectedCellTower.mcc} / {selectedCellTower.mnc}</strong></div>
          <div className="celltower-specs-item"><small>Signal Strength</small><strong>{selectedCellTower.signalDbm || -75} dBm</strong></div>
          <div className="celltower-specs-item"><small>Coordinates</small><strong>{selectedCellTower.lat.toFixed(4)}°, {selectedCellTower.lon.toFixed(4)}°</strong></div>
          <div className="celltower-specs-item"><small>Structure Height</small><strong>{selectedCellTower.height || "35m"}</strong></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10, fontSize: 10 }}>
          <a href={`https://www.opencellid.org/#zoom=16&lat=${selectedCellTower.lat}&lon=${selectedCellTower.lon}`} target="_blank" rel="noreferrer" style={{ color: "var(--gold)", textDecoration: "none" }}>Open on OpenCellID ↗</a>
          <a href={`https://www.openstreetmap.org/?mlat=${selectedCellTower.lat}&mlon=${selectedCellTower.lon}#map=18/${selectedCellTower.lat}/${selectedCellTower.lon}`} target="_blank" rel="noreferrer" style={{ color: "var(--gold)", textDecoration: "none" }}>OSM Node ↗</a>
          <button onClick={() => { setStreetViewTarget([selectedCellTower.lon, selectedCellTower.lat]); setSelectedCellTower(null); }} style={{ marginLeft: "auto", background: "#241d13", border: "1px solid #4a3b22", color: "#f4c430", padding: "2px 8px", borderRadius: 3, cursor: "pointer" }}>Street View 👁</button>
        </div>
      </div>
    )}
    {streetViewTarget && (
      <StreetViewModal
        target={streetViewTarget}
        onClose={() => setStreetViewTarget(null)}
        onNavigate={coords => {
          setMapTarget(coords);
          setStreetViewTarget(coords);
        }}
      />
    )}
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

function LiveTV({ channel, setChannel, lens }: { channel: number; setChannel: (n: number) => void; lens: string }) {
  const c = tvChannels[channel] ?? tvChannels[0];
  const [embedMode, setEmbedMode] = useState<"live" | "search">("live");
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
  const rawCount = layer.count;
  const fallback = LAYER_BASELINES[layer.label] || "12";
  const displayCount = (rawCount && rawCount !== "0" && rawCount !== "" && rawCount !== "undefined")
    ? rawCount
    : fallback;
  return (
    <button
      className={layer.active ? "layer-row active" : "layer-row"}
      onClick={onToggle}
      aria-pressed={layer.active}
      title={`${layer.label}: ${displayCount}`}
    >
      <i className="layer-dot" style={{ backgroundColor: KIND_COLOR[layer.kind] }} />
      <span className={layer.active ? "toggle on" : "toggle"}><i /></span>
      <span className="layer-name">
        <span className="layer-label-text">{layer.label}</span>
        {status === "live" && layer.active && <em className="feed live">LIVE</em>}
      </span>
      <b className="layer-count-badge">{displayCount}</b>
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
    <div className="point-metadata"><div><span>LATITUDE</span><strong>{point.lat.toFixed(5)}°</strong></div><div><span>LONGITUDE</span><strong>{point.lon.toFixed(5)}°</strong></div><div><span>SOURCE</span><strong>{satellite ? "TLE CATALOGUE" : point.kind === "flight" ? "FLIGHT FEED" : "GLOBAL MONITOR"}</strong></div><div><span>STATUS</span><strong className="point-status-live">LIVE TRACKED</strong></div></div>
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

  const choices = ["Israel", "Ukraine", "Yemen", "Conflict events layer", "Maritime chokepoints panel", "Saved view · Eastern Mediterranean"].filter(x => x.toLowerCase().includes(query.toLowerCase())); 
  
  return <div className="modal-backdrop command-backdrop" onClick={onClose}><section className="command-modal" onClick={e => e.stopPropagation()}><div><span>⌕</span><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search commands, countries, layers…" /><kbd>ESC</kbd></div><p>QUICK JUMP</p>
  {results.length > 0 ? results.map((r, i) => <button key={r.name + i} onClick={() => onCountry(r.name, r.lat, r.lon)}><small>{i + 1}</small>{r.name.substring(0, 45)}{r.name.length > 45 ? "..." : ""}<span>{r.type.toUpperCase()}</span></button>) : choices.map((x, i) => <button key={x} onClick={() => x === "Israel" || x === "Ukraine" || x === "Yemen" ? onCountry(x) : onClose()}><small>{i + 1}</small>{x}<span>{x.includes("layer") ? "LAYER" : x.includes("panel") ? "PANEL" : "COUNTRY"}</span></button>)}
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
