export interface TrackingAsset {
  id: string;
  trackingNumber: string;
  type: "ship" | "plane" | "ground" | "cargo";
  status: "IN TRANSIT" | "DELAYED" | "ARRIVED" | "PENDING";
  statusColor: string;
  name: string;
  operator: string;
  operatorLogo?: string;
  originCode: string;
  originCity: string;
  originCountry: string;
  destCode: string;
  destCity: string;
  destCountry: string;
  originFlag: string;
  destFlag: string;
  scheduledDep: string;
  actualDep: string;
  scheduledArr: string;
  estimatedArr: string;
  durationText: string;
  progressPercent: number;
  lat: number;
  lng: number;
  lon?: number;
  coordinatesText: string;
  agentName: string;
  agentRole: string;
  caseId: string;
  etaConfidence: "HIGH" | "MEDIUM" | "LOW";
  totalWeight: string;
  cargoDescription: string;
  dateStr: string;
}

export const SAMPLE_TRACKING_ASSETS: TrackingAsset[] = [
  {
    id: "qj3392",
    trackingNumber: "QJ3392N5XE",
    type: "ship",
    status: "IN TRANSIT",
    statusColor: "#38bdf8",
    name: "Maersk Mc-Kinney Møller",
    operator: "Transportation by Maersk Line",
    originCode: "SYD",
    originCity: "Sydney",
    originCountry: "Australia",
    destCode: "TMK",
    destCity: "Tomakomai",
    destCountry: "Japan",
    originFlag: "🇦🇺",
    destFlag: "🇯🇵",
    scheduledDep: "08:45 AM",
    actualDep: "09:10 AM",
    scheduledArr: "—",
    estimatedArr: "03:30 PM",
    durationText: "12D 06H 10M",
    progressPercent: 68,
    lat: 41.72,
    lng: 154.58,
    coordinatesText: "41.72°N, 154.58°E",
    agentName: "Haruto Sato",
    agentRole: "Port Dispatch Agent",
    caseId: "OPS-14784",
    etaConfidence: "HIGH",
    totalWeight: "18 420 KG",
    cargoDescription: "TEU Refrigerated Cargo & High-Tech Components",
    dateStr: "OCT 14, 2025, 09:10 (UTC)",
  },
  {
    id: "km1027",
    trackingNumber: "KM1027A9QF",
    type: "ship",
    status: "DELAYED",
    statusColor: "#f87171",
    name: "Ever Given - Ultra Large Container",
    operator: "Evergreen Marine Corp",
    originCode: "RTM",
    originCity: "Rotterdam",
    originCountry: "Netherlands",
    destCode: "SIN",
    destCity: "Singapore",
    destCountry: "Singapore",
    originFlag: "🇳🇱",
    destFlag: "🇸🇬",
    scheduledDep: "AUG 28, 2025",
    actualDep: "AUG 29, 2025",
    scheduledArr: "SEP 15, 2025",
    estimatedArr: "SEP 18, 2025",
    durationText: "18D 02H 45M",
    progressPercent: 42,
    lat: 12.6,
    lng: 43.3,
    coordinatesText: "12.60°N, 43.30°E",
    agentName: "Elena Vaneva",
    agentRole: "Maritime Traffic Coordinator",
    caseId: "OPS-89102",
    etaConfidence: "MEDIUM",
    totalWeight: "22 150 KG",
    cargoDescription: "Industrial Machinery & Semiconductor Lithography",
    dateStr: "SEP 05, 2025, 14:22 (UTC)",
  },
  {
    id: "zx7704",
    trackingNumber: "ZX7704L2CP",
    type: "plane",
    status: "IN TRANSIT",
    statusColor: "#38bdf8",
    name: "Boeing 777-F Cargo Freighter",
    operator: "Lufthansa Cargo Global Logistics",
    originCode: "FRA",
    originCity: "Frankfurt",
    originCountry: "Germany",
    destCode: "ORD",
    destCity: "Chicago",
    destCountry: "USA",
    originFlag: "🇩🇪",
    destFlag: "🇺🇸",
    scheduledDep: "OCT 3, 2025",
    actualDep: "06:15 AM",
    scheduledArr: "OCT 4, 2025",
    estimatedArr: "03:15 PM",
    durationText: "9H 00M",
    progressPercent: 55,
    lat: 53.5,
    lng: -35.2,
    coordinatesText: "53.50°N, 35.20°W",
    agentName: "Marcus Weber",
    agentRole: "Air Corridor Dispatcher",
    caseId: "AV-44021",
    etaConfidence: "HIGH",
    totalWeight: "8 940 KG",
    cargoDescription: "Precision Optics & Pharmaceutical Vaccines",
    dateStr: "OCT 03, 2025, 11:40 (UTC)",
  },
  {
    id: "ln5580",
    trackingNumber: "LN5580H1TD",
    type: "ground",
    status: "ARRIVED",
    statusColor: "#34d399",
    name: "Cross-Border Rail Freight Hub",
    operator: "DB Schenker Eurorail",
    originCode: "WAW",
    originCity: "Warsaw",
    originCountry: "Poland",
    destCode: "PRG",
    destCity: "Prague",
    destCountry: "Czechia",
    originFlag: "🇵🇱",
    destFlag: "🇨🇿",
    scheduledDep: "SEP 19, 2025",
    actualDep: "08:00 AM",
    scheduledArr: "SEP 19, 2025",
    estimatedArr: "06:45 PM",
    durationText: "2D",
    progressPercent: 100,
    lat: 50.08,
    lng: 14.43,
    coordinatesText: "50.08°N, 14.43°E",
    agentName: "Jakub Nowak",
    agentRole: "Ground Terminal Supervisor",
    caseId: "GR-12904",
    etaConfidence: "HIGH",
    totalWeight: "14 200 KG",
    cargoDescription: "Automotive Parts & Green Battery Cells",
    dateStr: "SEP 19, 2025, 19:00 (UTC)",
  },
  {
    id: "rb9016",
    trackingNumber: "RB9016V8MS",
    type: "ship",
    status: "PENDING",
    statusColor: "#fbbf24",
    name: "Cosco Shipping Universe",
    operator: "Cosco Shipping Lines",
    originCode: "HKG",
    originCity: "Hong Kong",
    originCountry: "Hong Kong",
    destCode: "DXB",
    destCity: "Dubai",
    destCountry: "UAE",
    originFlag: "🇭🇰",
    destFlag: "🇦🇪",
    scheduledDep: "OCT 21, 2025",
    actualDep: "Pending Cleared",
    scheduledArr: "NOV 03, 2025",
    estimatedArr: "NOV 03, 2025",
    durationText: "12D",
    progressPercent: 10,
    lat: 22.3,
    lng: 114.1,
    coordinatesText: "22.30°N, 114.10°E",
    agentName: "Chen Wei",
    agentRole: "Customs Clearance Officer",
    caseId: "CS-99104",
    etaConfidence: "HIGH",
    totalWeight: "31 500 KG",
    cargoDescription: "Consumer Electronics & Renewable Solar Inverters",
    dateStr: "OCT 21, 2025, 04:30 (UTC)",
  },
];
