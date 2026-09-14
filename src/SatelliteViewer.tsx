import { useEffect, useMemo, useState } from "react";
import {
  generateSatelliteData,
  satelliteApiNotes,
  satelliteTypes,
  satelliteTypeImages,
  type Satellite,
} from "./satellitedata";
import {
  fetchLiveNasaMeteors,
  METEOR_CLASSIFICATIONS,
  FALLBACK_FIREBALLS,
  FALLBACK_CLOSE_APPROACHES,
  type MeteorFireball,
  type MeteorCloseApproach,
} from "./meteordata";

type SatelliteViewerProps = {
  onClose?: () => void;
  onSatelliteSelect?: (satellite: Satellite) => void;
};

type ViewMode = "satellites" | "meteors" | "classification";
type MeteorFilter = "all" | "fireballs" | "flybys" | "pha";

const countrySignals: Record<string, string[]> = {
  India: [
    "Cyclone, storm, and monsoon telemetry over Arabian Sea and Bay of Bengal",
    "Major ports, rail freight, and energy corridors under orbital monitoring",
    "Border, maritime surveillance, and NavIC regional positioning active",
  ],
  "United States": [
    "Severe weather, wildfire, hurricane, and airspace radar signals",
    "Starlink & commercial satellite constellation broadband infrastructure",
    "Atlantic and Pacific maritime corridors monitored by polar NOAA orbiters",
  ],
  China: [
    "Tiangong modular space station operating with Shenzhou crew on board",
    "Typhoon, industrial, shipping, and regional maritime surveillance active",
  ],
  Europe: [
    "Galileo GNSS precision navigation and Copernicus Sentinel Earth telemetry",
    "North Sea, Mediterranean shipping, and climate observation arrays",
  ],
  International: [
    "International Space Station (ISS) orbiting at 7.66 km/s at ~420 km altitude",
    "Multi-agency Earth observation and cross-regional planetary monitoring",
  ],
};

const typeTone: Record<Satellite["type"], { label: string; color: string }> = {
  ISS: { label: "Crewed", color: "#f4c430" },
  SPACE_STATION: { label: "Station", color: "#68d391" },
  WEATHER: { label: "Weather", color: "#63b3ed" },
  COMMUNICATIONS: { label: "Comms", color: "#ecc94b" },
  EARTH_OBSERVATION: { label: "Earth Obs", color: "#fc8181" },
  NAVIGATION: { label: "Nav", color: "#b794f4" },
};

function countryFromPosition(lat: number, lon: number) {
  if (lat >= 6 && lat <= 37 && lon >= 68 && lon <= 98) return "India";
  if (lat >= 18 && lat <= 54 && lon >= -130 && lon <= -60) return "United States";
  if (lat >= 18 && lat <= 54 && lon >= 73 && lon <= 135) return "China";
  if (lat >= 35 && lat <= 72 && lon >= -12 && lon <= 45) return "Europe";
  if (lat >= -35 && lat <= 37 && lon >= -20 && lon <= 52) return "Africa";
  return "Open ocean / regional corridor";
}

export default function SatelliteViewer({ onClose, onSatelliteSelect }: SatelliteViewerProps) {
  const [activeTab, setActiveTab] = useState<ViewMode>("satellites");
  const [liveIss, setLiveIss] = useState<{ lat: number; lon: number }>();
  const [selectedCountry, setSelectedCountry] = useState("India");
  const [selectedType, setSelectedType] = useState<Satellite["type"] | "all">("all");
  const [selectedSatelliteId, setSelectedSatelliteId] = useState(25544);
  const [sourceState, setSourceState] = useState<"live" | "sample">("sample");
  const [tick, setTick] = useState(0);

  // NASA Meteor Tracking State
  const [fireballs, setFireballs] = useState<MeteorFireball[]>(FALLBACK_FIREBALLS);
  const [closeApproaches, setCloseApproaches] = useState<MeteorCloseApproach[]>(FALLBACK_CLOSE_APPROACHES);
  const [meteorSourceState, setMeteorSourceState] = useState<"live" | "fallback">("fallback");
  const [meteorLoading, setMeteorLoading] = useState(false);
  const [meteorFilter, setMeteorFilter] = useState<MeteorFilter>("all");
  const [selectedFireballId, setSelectedFireballId] = useState<string | null>(null);
  const [selectedCadId, setSelectedCadId] = useState<string | null>(null);
  const [overlayMeteorsOnMap, setOverlayMeteorsOnMap] = useState(true);

  // Load ISS telemetry
  useEffect(() => {
    let active = true;
    const loadIss = async () => {
      try {
        const response = await fetch("http://api.open-notify.org/iss-now.json");
        const data = await response.json();
        if (!active || data?.message !== "success") return;
        setLiveIss({ lat: Number(data.iss_position.latitude), lon: Number(data.iss_position.longitude) });
        setSourceState("live");
      } catch {
        if (active) setSourceState("sample");
      }
    };
    loadIss();
    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
      loadIss();
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  // Load NASA Meteor telemetry
  useEffect(() => {
    let active = true;
    const loadMeteors = async () => {
      setMeteorLoading(true);
      try {
        const data = await fetchLiveNasaMeteors();
        if (!active) return;
        setFireballs(data.fireballs);
        setCloseApproaches(data.closeApproaches);
        setMeteorSourceState(data.status);
        if (data.fireballs.length > 0 && !selectedFireballId) {
          setSelectedFireballId(data.fireballs[0].id);
        }
        if (data.closeApproaches.length > 0 && !selectedCadId) {
          setSelectedCadId(data.closeApproaches[0].id);
        }
      } catch (err) {
        console.warn("NASA meteor fetch notice:", err);
      } finally {
        if (active) setMeteorLoading(false);
      }
    };
    loadMeteors();
  }, []);

  const satellites = useMemo(() => generateSatelliteData(liveIss), [liveIss, tick]);
  const countries = useMemo(
    () => [
      "India",
      "All",
      ...Array.from(new Set(satellites.map((sat) => sat.country).filter((country) => country !== "India"))).sort(),
    ],
    [satellites]
  );

  const filteredSatellites = satellites.filter((sat) => {
    const countryMatch =
      selectedCountry === "All" ||
      sat.country === selectedCountry ||
      (selectedCountry === "India" && sat.country === "International");
    const typeMatch = selectedType === "all" || sat.type === selectedType;
    return countryMatch && typeMatch;
  });

  const selectedSatellite =
    satellites.find((sat) => sat.id === selectedSatelliteId) || filteredSatellites[0] || satellites[0];
  const footprintCountry = countryFromPosition(selectedSatellite.lat, selectedSatellite.lon);
  const happenings =
    countrySignals[selectedSatellite.country] ||
    countrySignals[footprintCountry] || [
      "Regional news, climate, maritime, and planetary security telemetry active.",
    ];

  // Filtered meteors
  const filteredFireballs = useMemo(() => {
    if (meteorFilter === "flybys" || meteorFilter === "pha") return [];
    return fireballs;
  }, [fireballs, meteorFilter]);

  const filteredCloseApproaches = useMemo(() => {
    if (meteorFilter === "fireballs") return [];
    if (meteorFilter === "pha") return closeApproaches.filter((c) => c.isPotentiallyHazardous);
    return closeApproaches;
  }, [closeApproaches, meteorFilter]);

  const selectedFireball = fireballs.find((f) => f.id === selectedFireballId) || fireballs[0];
  const selectedCad = closeApproaches.find((c) => c.id === selectedCadId) || closeApproaches[0];

  return (
    <div className="satellite-viewer">
      {/* Header with Navigation Tabs */}
      <div className="satellite-header">
        <div className="satellite-header-left">
          <div className="sat-title-row">
            <h2>Orbital & Planetary Space Monitor</h2>
            <div className="sat-view-tabs">
              <button
                className={`sat-tab-btn ${activeTab === "satellites" ? "active" : ""}`}
                onClick={() => setActiveTab("satellites")}
              >
                <span className="tab-icon">🛰️</span>
                <span>Satellites ({satellites.length})</span>
              </button>
              <button
                className={`sat-tab-btn ${activeTab === "meteors" ? "active" : ""}`}
                onClick={() => setActiveTab("meteors")}
              >
                <span className="tab-icon">☄️</span>
                <span>NASA Meteor Tracker ({fireballs.length + closeApproaches.length})</span>
              </button>
              <button
                className={`sat-tab-btn ${activeTab === "classification" ? "active" : ""}`}
                onClick={() => setActiveTab("classification")}
              >
                <span className="tab-icon">📖</span>
                <span>Meteor Kinds & Taxonomy</span>
              </button>
            </div>
          </div>
          <p className="sat-header-desc">
            {activeTab === "satellites" &&
              "High-resolution real imagery of satellites with live ISS tracking, NORAD catalog IDs, and orbital footprints."}
            {activeTab === "meteors" &&
              "Live NASA Planetary Defense & CNEOS feeds tracking atmospheric fireball detonations, impact energies (kt TNT), and Near-Earth close passes."}
            {activeTab === "classification" &&
              "Comprehensive scientific dossier on the specific types and orbit classes of meteors tracked by NASA sensors."}
          </p>
        </div>
        {onClose && (
          <button className="close-btn" onClick={onClose} aria-label="Close Satellite Viewer">
            ✕
          </button>
        )}
      </div>

      {/* ================= SATELLITE VIEW ================= */}
      {activeTab === "satellites" && (
        <>
          <div className="satellite-controls">
            <div className="control-group">
              <label>Country view</label>
              <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="control-group">
              <label>Satellite type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as Satellite["type"] | "all")}
              >
                <option value="all">All types</option>
                {satelliteTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="control-group checkbox-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={overlayMeteorsOnMap}
                  onChange={(e) => setOverlayMeteorsOnMap(e.target.checked)}
                />
                <span>Overlay NASA Fireballs on Map</span>
              </label>
            </div>
            <div className="stats">
              <span>
                <strong>{filteredSatellites.length}</strong> tracked
              </span>
              <span>
                <strong>{filteredSatellites.filter((s) => s.country === "India").length}</strong> India assets
              </span>
              <span className={sourceState === "live" ? "feed live" : "feed sample"}>
                {sourceState === "live" ? "ISS LIVE (OPEN NOTIFY)" : "ORBITAL ESTIMATE"}
              </span>
            </div>
          </div>

          <div className="satellite-content">
            {/* World Map with Satellites and Fireballs */}
            <section className="satellite-map-panel">
              <div className="map-title-row">
                <span className="map-title">Orbital Ground Track & Planetary Map</span>
                <span className="map-legend-note">
                  {overlayMeteorsOnMap ? "Showing Satellites + NASA Atmospheric Fireballs" : "Showing Satellites"}
                </span>
              </div>
              <div className="sat-map">
                <svg viewBox="0 0 720 360" role="img" aria-label="Satellite positions and meteors on world map">
                  <defs>
                    <linearGradient id="satOcean" x1="0" x2="1">
                      <stop offset="0" stopColor="#080c12" />
                      <stop offset="1" stopColor="#14100b" />
                    </linearGradient>
                    <radialGradient id="meteorGlow">
                      <stop offset="0%" stopColor="#ff4500" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#ff8c00" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ff4500" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <rect width="720" height="360" fill="url(#satOcean)" />
                  {/* Grid Lines */}
                  {Array.from({ length: 13 }).map((_, i) => (
                    <line key={`lat-${i}`} x1="0" x2="720" y1={i * 30} y2={i * 30} stroke="#221c15" strokeWidth="0.8" />
                  ))}
                  {Array.from({ length: 25 }).map((_, i) => (
                    <line key={`lon-${i}`} y1="0" y2="360" x1={i * 30} x2={i * 30} stroke="#221c15" strokeWidth="0.8" />
                  ))}
                  {/* Land outlines */}
                  <path
                    d="M134 125l48-26 76 16 43 45-27 36-83 12-58-30zM308 96l75-22 91 24 42 44-29 54-91 24-70-45zM466 190l82-16 84 31 38 48-45 38-91-6-66-42zM212 236l54 16 37 39-22 35-75-4-42-28z"
                    fill="#1e1811"
                    stroke="#433624"
                    strokeWidth="1.2"
                  />

                  {/* NASA Fireball Impact Markers Overlay */}
                  {overlayMeteorsOnMap &&
                    fireballs.slice(0, 15).map((fb) => {
                      const fx = ((fb.lon + 180) / 360) * 720;
                      const fy = ((90 - fb.lat) / 180) * 360;
                      const r = Math.min(16, Math.max(5, Math.round(Math.sqrt(fb.impactEnergyKt * 15) + 5)));
                      return (
                        <g
                          key={fb.id}
                          className="meteor-map-node"
                          onClick={() => {
                            setActiveTab("meteors");
                            setSelectedFireballId(fb.id);
                          }}
                        >
                          <circle cx={fx} cy={fy} r={r * 2} fill="url(#meteorGlow)" className="meteor-pulse-ring" />
                          <circle cx={fx} cy={fy} r={r} fill="#ff5722" stroke="#fff" strokeWidth="1" opacity="0.9" />
                          {(selectedFireball?.id === fb.id || fb.impactEnergyKt >= 1.0) && (
                            <text x={fx} y={Math.min(350, fy + 12)} className="meteor-map-label">
                              ☄️ {fb.impactEnergyKt.toFixed(2)} kt
                            </text>
                          )}
                        </g>
                      );
                    })}

                  {/* Satellites */}
                  {filteredSatellites.map((sat) => {
                    const x = ((sat.lon + 180) / 360) * 720;
                    const y = ((90 - sat.lat) / 180) * 360;
                    const tone = typeTone[sat.type];
                    const selected = sat.id === selectedSatellite.id;
                    return (
                      <g
                        key={sat.id}
                        className="sat-node"
                        onClick={() => {
                          setSelectedSatelliteId(sat.id);
                          onSatelliteSelect?.(sat);
                        }}
                      >
                        <circle cx={x} cy={y} r={selected ? 20 : 13} fill={tone.color} opacity="0.22" />
                        <circle cx={x} cy={y} r={selected ? 7 : 4} fill={tone.color} stroke="#fff" strokeWidth="1" />
                        <line x1={x - 14} x2={x - 24} y1={y} y2={y - 6} stroke={tone.color} strokeWidth="2" />
                        <line x1={x + 14} x2={x + 24} y1={y} y2={y + 6} stroke={tone.color} strokeWidth="2" />
                        {selected && (
                          <text x={x} y={Math.max(16, y - 16)} className="sat-map-label-active">
                            {sat.name}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </section>

            {/* Satellite List with Real PNG Images */}
            <section className="satellite-list">
              <div className="list-title-row">
                <span className="list-title">Active Satellites & Space Stations</span>
                <span className="sat-photo-indicator">Photographic PNG Assets</span>
              </div>
              <div className="satellites-scroll">
                {filteredSatellites.map((sat) => {
                  const isSelected = selectedSatellite.id === sat.id;
                  return (
                    <button
                      key={sat.id}
                      className={`satellite-item ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedSatelliteId(sat.id);
                        onSatelliteSelect?.(sat);
                      }}
                    >
                      {/* Real Image PNG Thumbnail */}
                      <div className="sat-thumb-container">
                        <img
                          src={sat.image || satelliteTypeImages[sat.type]}
                          alt={sat.name}
                          className="sat-thumb-img"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to type image
                            (e.currentTarget as HTMLImageElement).src = satelliteTypeImages[sat.type];
                          }}
                        />
                        <span
                          className="sat-type-chip"
                          style={{
                            borderColor: typeTone[sat.type].color,
                            color: typeTone[sat.type].color,
                          }}
                        >
                          {typeTone[sat.type].label}
                        </span>
                      </div>

                      {/* Details */}
                      <span className="sat-info">
                        <strong>{sat.name}</strong>
                        <small>
                          {sat.country} • NORAD {sat.noradId}
                        </small>
                        <em>{sat.focus}</em>
                      </span>

                      {/* Speed & Altitude */}
                      <div className="sat-telemetry">
                        <span className="sat-data">{Math.round(sat.altitude).toLocaleString()} km</span>
                        <span className="sat-speed">{sat.velocity.toFixed(2)} km/s</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Selected Satellite Dossier with Real Hero Image */}
          <div className="satellite-hero-dossier">
            <div className="satellite-hero-card">
              <div className="satellite-hero-img-wrap">
                <img
                  src={selectedSatellite.image || satelliteTypeImages[selectedSatellite.type]}
                  alt={selectedSatellite.name}
                  className="satellite-hero-img"
                />
                <div className="satellite-hero-overlay">
                  <span
                    className="sat-hero-type-pill"
                    style={{ backgroundColor: typeTone[selectedSatellite.type].color }}
                  >
                    {typeTone[selectedSatellite.type].label}
                  </span>
                  <span className="sat-hero-country">{selectedSatellite.country}</span>
                </div>
              </div>

              <div className="satellite-hero-content">
                <div className="satellite-hero-title-row">
                  <div>
                    <h3>{selectedSatellite.name}</h3>
                    <p className="sat-focus-text">{selectedSatellite.focus}</p>
                  </div>
                  <span className="sat-status-live">ORBITAL TRACKING ACTIVE</span>
                </div>

                <div className="details-grid">
                  <div>
                    <span>NORAD ID</span>
                    <strong>{selectedSatellite.noradId}</strong>
                  </div>
                  <div>
                    <span>Sub-Satellite Lat/Lon</span>
                    <strong>
                      {selectedSatellite.lat.toFixed(2)}°, {selectedSatellite.lon.toFixed(2)}°
                    </strong>
                  </div>
                  <div>
                    <span>Orbital Altitude</span>
                    <strong>{Math.round(selectedSatellite.altitude).toLocaleString()} km</strong>
                  </div>
                  <div>
                    <span>Velocity</span>
                    <strong>
                      {selectedSatellite.velocity.toFixed(2)} km/s ({Math.round(selectedSatellite.velocity * 3600).toLocaleString()} km/h)
                    </strong>
                  </div>
                  <div>
                    <span>Geographic Footprint</span>
                    <strong>{footprintCountry}</strong>
                  </div>
                  <div>
                    <span>Illumination</span>
                    <strong style={{ textTransform: "capitalize" }}>{selectedSatellite.visibility}</strong>
                  </div>
                  <div>
                    <span>Orbital Type</span>
                    <strong>{selectedSatellite.type.replace(/_/g, " ")}</strong>
                  </div>
                  <div>
                    <span>Telemetry Source</span>
                    <strong>{selectedSatellite.source}</strong>
                  </div>
                </div>

                <div className="country-happenings">
                  <span className="happenings-header">Orbital Pass Context & Ground Observation Signals</span>
                  {happenings.map((item) => (
                    <p key={item}>• {item}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="api-info">
            {satelliteApiNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </>
      )}

      {/* ================= NASA METEOR TRACKING VIEW ================= */}
      {activeTab === "meteors" && (
        <div className="meteor-tracker-container">
          {/* Controls & Filter Bar */}
          <div className="meteor-controls-bar">
            <div className="meteor-filter-tabs">
              <button
                className={`meteor-filter-btn ${meteorFilter === "all" ? "active" : ""}`}
                onClick={() => setMeteorFilter("all")}
              >
                All Meteor Telemetry ({fireballs.length + closeApproaches.length})
              </button>
              <button
                className={`meteor-filter-btn ${meteorFilter === "fireballs" ? "active" : ""}`}
                onClick={() => setMeteorFilter("fireballs")}
              >
                💥 Atmospheric Fireballs & Bolides ({fireballs.length})
              </button>
              <button
                className={`meteor-filter-btn ${meteorFilter === "flybys" ? "active" : ""}`}
                onClick={() => setMeteorFilter("flybys")}
              >
                🔭 Near-Earth Flybys ({closeApproaches.length})
              </button>
              <button
                className={`meteor-filter-btn ${meteorFilter === "pha" ? "active" : ""}`}
                onClick={() => setMeteorFilter("pha")}
              >
                ⚠️ Potentially Hazardous ({closeApproaches.filter((c) => c.isPotentiallyHazardous).length})
              </button>
            </div>

            <div className="meteor-source-badge">
              <span className={`status-indicator ${meteorSourceState === "live" ? "online" : "sample"}`}></span>
              <span>
                {meteorLoading
                  ? "FETCHING NASA CNEOS..."
                  : meteorSourceState === "live"
                  ? "NASA CNEOS & JPL CAD LIVE"
                  : "NASA AUTHENTIC ARCHIVE"}
              </span>
            </div>
          </div>

          {/* NASA Fireballs Map */}
          <div className="meteor-map-section">
            <div className="map-title-row">
              <span className="map-title">NASA CNEOS Atmospheric Meteor Impact & Airburst Map</span>
              <span className="map-legend-note">
                🔴 Hypervelocity Atmospheric Entry • Size represents calculated TNT yield
              </span>
            </div>
            <div className="sat-map meteor-sat-map">
              <svg viewBox="0 0 720 360" role="img" aria-label="NASA Meteor fireball locations on world map">
                <defs>
                  <radialGradient id="fireballPulse">
                    <stop offset="0%" stopColor="#ff3d00" stopOpacity="0.9" />
                    <stop offset="60%" stopColor="#ff9100" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ff3d00" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="720" height="360" fill="#0b0e14" />
                {Array.from({ length: 13 }).map((_, i) => (
                  <line key={`lat-${i}`} x1="0" x2="720" y1={i * 30} y2={i * 30} stroke="#1b212c" strokeWidth="0.8" />
                ))}
                {Array.from({ length: 25 }).map((_, i) => (
                  <line key={`lon-${i}`} x1={i * 30} x2={i * 30} y1="0" y2="360" stroke="#1b212c" strokeWidth="0.8" />
                ))}
                <path
                  d="M134 125l48-26 76 16 43 45-27 36-83 12-58-30zM308 96l75-22 91 24 42 44-29 54-91 24-70-45zM466 190l82-16 84 31 38 48-45 38-91-6-66-42zM212 236l54 16 37 39-22 35-75-4-42-28z"
                  fill="#181e28"
                  stroke="#374151"
                  strokeWidth="1.2"
                />

                {fireballs.map((fb) => {
                  const x = ((fb.lon + 180) / 360) * 720;
                  const y = ((90 - fb.lat) / 180) * 360;
                  const isSelected = fb.id === selectedFireball.id;
                  const r = Math.min(22, Math.max(6, Math.round(Math.sqrt(fb.impactEnergyKt * 20) + 6)));
                  return (
                    <g
                      key={fb.id}
                      className={`meteor-node ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedFireballId(fb.id)}
                    >
                      <circle cx={x} cy={y} r={r * 2.2} fill="url(#fireballPulse)" className="meteor-pulse-ring" />
                      <circle
                        cx={x}
                        cy={y}
                        r={r}
                        fill={isSelected ? "#ffff00" : "#ff5722"}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      {(isSelected || fb.impactEnergyKt >= 0.8) && (
                        <text x={x} y={Math.max(12, y - r - 4)} className="meteor-svg-label">
                          {fb.region} ({fb.impactEnergyKt.toFixed(2)} kt)
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Selected Fireball Details Card */}
          {selectedFireball && (
            <div className="selected-meteor-hero-card">
              <div className="meteor-hero-image-side">
                <img src="/meteors/fireball.png" alt="Meteor Bolide in Earth Atmosphere" className="meteor-hero-img" />
                <div className="meteor-hero-badge">
                  <span>{selectedFireball.classification}</span>
                  <strong>{selectedFireball.severity}</strong>
                </div>
              </div>
              <div className="meteor-hero-telemetry">
                <div className="meteor-title-row">
                  <div>
                    <h4>{selectedFireball.region} Fireball Event</h4>
                    <span className="meteor-date-tag">Detonation UTC: {selectedFireball.date}</span>
                  </div>
                  <span className="cneos-pill">NASA CNEOS VERIFIED</span>
                </div>

                <div className="meteor-metrics-grid">
                  <div className="metric-box highlight-metric">
                    <span className="metric-lbl">Total Impact Energy</span>
                    <strong className="metric-val">{selectedFireball.impactEnergyKt.toFixed(2)} kt TNT</strong>
                    <small className="metric-sub">
                      ~{(selectedFireball.impactEnergyKt * 4.184).toFixed(1)} TeraJoules
                    </small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-lbl">Optical Radiated Energy</span>
                    <strong className="metric-val">{(selectedFireball.energyJoules / 1e10).toFixed(1)} × 10¹⁰ J</strong>
                    <small className="metric-sub">Luminous flux</small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-lbl">Peak Detonation Alt</span>
                    <strong className="metric-val">
                      {selectedFireball.altitudeKm ? `${selectedFireball.altitudeKm.toFixed(1)} km` : "Stratosphere"}
                    </strong>
                    <small className="metric-sub">Mesosphere / Stratosphere</small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-lbl">Hypersonic Velocity</span>
                    <strong className="metric-val">
                      {selectedFireball.velocityKmS ? `${selectedFireball.velocityKmS.toFixed(1)} km/s` : "Hypersonic"}
                    </strong>
                    <small className="metric-sub">
                      {selectedFireball.velocityKmS
                        ? `${Math.round(selectedFireball.velocityKmS * 3600).toLocaleString()} km/h`
                        : "Mach 35+"}
                    </small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-lbl">Coordinates</span>
                    <strong className="metric-val">
                      {selectedFireball.lat.toFixed(2)}°, {selectedFireball.lon.toFixed(2)}°
                    </strong>
                    <small className="metric-sub">Impact sub-point</small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-lbl">Detection System</span>
                    <strong className="metric-val">Optical & Infrasound</strong>
                    <small className="metric-sub">US Gov Satellites & CTBTO</small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Two Columns: Live Atmospheric Fireballs & Near-Earth Flybys */}
          <div className="meteor-feed-columns">
            {/* Atmospheric Fireballs Column */}
            {(meteorFilter === "all" || meteorFilter === "fireballs") && (
              <div className="meteor-column">
                <div className="col-header">
                  <h5>💥 Atmospheric Meteor Fireballs & Bolides ({filteredFireballs.length})</h5>
                  <span className="col-badge">CNEOS Atmospheric Entries</span>
                </div>
                <div className="meteor-card-scroll">
                  {filteredFireballs.map((fb) => (
                    <div
                      key={fb.id}
                      className={`meteor-card ${selectedFireball.id === fb.id ? "active-card" : ""}`}
                      onClick={() => setSelectedFireballId(fb.id)}
                    >
                      <div className="meteor-card-head">
                        <span className="card-region">{fb.region}</span>
                        <span className="card-energy-badge">{fb.impactEnergyKt.toFixed(2)} kt TNT</span>
                      </div>
                      <div className="meteor-card-body">
                        <span>📅 {fb.date}</span>
                        <span>
                          📍 {fb.lat.toFixed(1)}°, {fb.lon.toFixed(1)}°
                        </span>
                        <span>
                          💨 Speed: {fb.velocityKmS ? `${fb.velocityKmS.toFixed(1)} km/s` : "Hypersonic"}
                        </span>
                        <span>
                          🏔️ Alt: {fb.altitudeKm ? `${fb.altitudeKm.toFixed(1)} km` : "Upper Atmosphere"}
                        </span>
                      </div>
                      <div className="meteor-card-foot">
                        <span className="foot-class">{fb.classification}</span>
                        <span className="foot-severity">{fb.severity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Near-Earth Close Approaches Column */}
            {(meteorFilter === "all" || meteorFilter === "flybys" || meteorFilter === "pha") && (
              <div className="meteor-column">
                <div className="col-header">
                  <h5>🔭 Upcoming Near-Earth Meteors & Asteroids ({filteredCloseApproaches.length})</h5>
                  <span className="col-badge">NASA JPL Close-Approach Data</span>
                </div>
                <div className="meteor-card-scroll">
                  {filteredCloseApproaches.map((cad) => (
                    <div
                      key={cad.id}
                      className={`meteor-card cad-card ${cad.isPotentiallyHazardous ? "hazard-card" : ""} ${
                        selectedCad.id === cad.id ? "active-card" : ""
                      }`}
                      onClick={() => setSelectedCadId(cad.id)}
                    >
                      <div className="meteor-card-head">
                        <span className="card-region">{cad.designation}</span>
                        <span className={`orbit-badge orbit-${cad.orbitClass.toLowerCase()}`}>
                          {cad.orbitClass} Class
                        </span>
                      </div>
                      <div className="meteor-card-body">
                        <span>📅 Encounter: {cad.closeApproachDate}</span>
                        <span>
                          📏 Miss Distance: <strong>{cad.distLunar} Lunar Distances</strong> (
                          {(cad.distKm / 1e6).toFixed(2)}M km)
                        </span>
                        <span>
                          📐 Size: <strong>{cad.estimatedDiameterMeters.text}</strong>
                        </span>
                        <span>
                          ⚡ Relative Speed: <strong>{cad.velocityKmS} km/s</strong> (
                          {Math.round(cad.velocityKmS * 3600).toLocaleString()} km/h)
                        </span>
                        <span>🌟 Absolute Mag H: {cad.absoluteMagnitudeH}</span>
                      </div>
                      <div className="meteor-card-foot">
                        <span className={`hazard-status ${cad.isPotentiallyHazardous ? "hazard-alert" : ""}`}>
                          {cad.hazardLevel}
                        </span>
                        <span className="source-note">NASA SSD CAD</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= METEOR KINDS & CLASSIFICATION DOSSIER ================= */}
      {activeTab === "classification" && (
        <div className="meteor-classification-dossier">
          <div className="dossier-intro">
            <h3>Planetary Defense: What Kinds of Meteors Does NASA Track?</h3>
            <p>
              NASA's Planetary Defense Coordination Office (PDCO), the Center for Near-Earth Object Studies (CNEOS),
              and the Jet Propulsion Laboratory (JPL) track extraterrestrial bodies across distinct astronomical
              classes based on orbital dynamics, atmospheric entry risk, and composition.
            </p>
          </div>

          <div className="classification-cards-grid">
            {METEOR_CLASSIFICATIONS.map((c) => (
              <div key={c.type} className="classification-card" style={{ borderTopColor: c.color }}>
                <div className="class-card-head">
                  <div className="class-name-row">
                    <h4>{c.name}</h4>
                    <span className="threat-pill" style={{ borderColor: c.color, color: c.color }}>
                      {c.threatLevel}
                    </span>
                  </div>
                </div>
                <div className="class-card-body">
                  <p className="class-desc">{c.description}</p>
                  <div className="class-detail-section">
                    <strong>Surveillance & Tracking Sensor System:</strong>
                    <p>{c.trackingMethod}</p>
                  </div>
                  <div className="class-detail-section">
                    <strong>Historic & Active Tracked Examples:</strong>
                    <p className="examples-text">{c.examples}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Educational Quick Reference */}
          <div className="meteor-reference-box">
            <h4>Astronomical Metric Guide for Planetary Defense</h4>
            <div className="reference-metrics-grid">
              <div>
                <strong>Lunar Distance (LD)</strong>
                <p>1 LD = ~384,400 km (Earth to Moon). Anything closer than 1 LD passes inside the Moon's orbit.</p>
              </div>
              <div>
                <strong>Astronomical Unit (AU)</strong>
                <p>1 AU = ~149,597,870 km (Earth to Sun). Close encounters are monitored when distance &lt; 0.05 AU.</p>
              </div>
              <div>
                <strong>Absolute Magnitude (H)</strong>
                <p>Intrinsic brightness. Lower H = larger object. H = 22 corresponds to ~140m diameter threshold.</p>
              </div>
              <div>
                <strong>Detonation Energy (kt TNT)</strong>
                <p>1 kiloton TNT = 4.184 Terajoules. Hiroshima was ~15 kt; Chelyabinsk superbolide was ~440 kt.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
