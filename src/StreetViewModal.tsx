import { useState, useEffect, useRef } from "react";
import { Compass, ExternalLink, Globe, MapPin, Maximize2, Navigation, RefreshCw, X, ZoomIn, ZoomOut } from "lucide-react";

export interface StreetViewProps {
  target: [number, number]; // [lng, lat]
  onClose: () => void;
  onNavigate?: (coords: [number, number]) => void;
}

interface LandmarkPreset {
  name: string;
  city: string;
  country: string;
  coords: [number, number]; // [lng, lat]
  heading: number;
}

const LANDMARK_PRESETS: LandmarkPreset[] = [
  { name: "Shibuya Crossing", city: "Tokyo", country: "Japan", coords: [139.7005, 35.6595], heading: 45 },
  { name: "Times Square", city: "New York", country: "USA", coords: [-73.9855, 40.7580], heading: 180 },
  { name: "Eiffel Tower", city: "Paris", country: "France", coords: [2.2945, 48.8584], heading: 315 },
  { name: "Piccadilly Circus", city: "London", country: "UK", coords: [-0.1340, 51.5101], heading: 90 },
  { name: "Upper Lake Promenade", city: "Bhopal", country: "India", coords: [77.3910, 23.2450], heading: 220 },
  { name: "Marine Drive", city: "Mumbai", country: "India", coords: [72.8230, 18.9432], heading: 260 },
  { name: "Brandenburg Gate", city: "Berlin", country: "Germany", coords: [13.3777, 52.5163], heading: 270 },
  { name: "Burj Khalifa Boulevard", city: "Dubai", country: "UAE", coords: [55.2744, 25.1972], heading: 140 },
  { name: "Sydney Harbour", city: "Sydney", country: "Australia", coords: [151.2153, -33.8568], heading: 350 },
];

export default function StreetViewModal({ target, onClose, onNavigate }: StreetViewProps) {
  const [currentCoords, setCurrentCoords] = useState<[number, number]>(target);
  const [address, setAddress] = useState<string>("Locating street position…");
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [heading, setHeading] = useState(45);
  const [pitch, setPitch] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [lng, lat] = currentCoords;

  // Reverse geocode clicked location via OpenStreetMap Nominatim
  useEffect(() => {
    let active = true;
    setLoadingAddress(true);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: { "Accept-Language": "en" }
    })
      .then(res => res.json())
      .then(data => {
        if (!active) return;
        if (data?.display_name) {
          setAddress(data.display_name);
        } else {
          setAddress(`${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`);
        }
        setLoadingAddress(false);
      })
      .catch(() => {
        if (!active) return;
        setAddress(`${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`);
        setLoadingAddress(false);
      });

    return () => { active = false; };
  }, [lat, lng]);

  // Render 360° simulated panoramic street view with ground grid, horizon, building silhouettes, and compass
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.height = canvas.parentElement?.clientHeight || 480;

    ctx.clearRect(0, 0, width, height);

    // Sky gradient with atmospheric perspective
    const horizonY = height * 0.52 + pitch * 2;
    const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGradient.addColorStop(0, "#08101a");
    skyGradient.addColorStop(0.65, "#152438");
    skyGradient.addColorStop(1, "#283b54");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, horizonY);

    // Distant urban skyline / horizon features based on heading
    ctx.fillStyle = "#111a26";
    const numBuildings = 24;
    for (let i = 0; i < numBuildings; i++) {
      const bx = ((i * 55 - (heading * 4) % (width + 200)) + width * 2) % width;
      const bHeight = 40 + Math.sin(i * 1.7) * 35 + (i % 3 === 0 ? 45 : 0);
      const bWidth = 32 + (i % 4) * 8;
      ctx.fillRect(bx, horizonY - bHeight, bWidth, bHeight);

      // Window lights on buildings
      ctx.fillStyle = "#d4af3740";
      for (let wy = horizonY - bHeight + 8; wy < horizonY - 10; wy += 12) {
        for (let wx = bx + 4; wx < bx + bWidth - 6; wx += 8) {
          if ((i + wx + wy) % 5 !== 0) {
            ctx.fillRect(wx, wy, 3, 4);
          }
        }
      }
      ctx.fillStyle = "#111a26";
    }

    // Street ground plane
    const groundGradient = ctx.createLinearGradient(0, horizonY, 0, height);
    groundGradient.addColorStop(0, "#1c1a17");
    groundGradient.addColorStop(0.4, "#24201b");
    groundGradient.addColorStop(1, "#14120f");
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // Street perspective road markings
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "#40382b";
    ctx.lineWidth = 2;

    const roadCenter = width * 0.5 + Math.sin((heading * Math.PI) / 180) * 80;
    const roadWidthHorizon = 40;
    const roadWidthBottom = width * 0.85;

    // Road edges
    ctx.beginPath();
    ctx.moveTo(roadCenter - roadWidthHorizon, horizonY);
    ctx.lineTo(roadCenter - roadWidthBottom, height);
    ctx.moveTo(roadCenter + roadWidthHorizon, horizonY);
    ctx.lineTo(roadCenter + roadWidthBottom, height);
    ctx.stroke();

    // Road centerline dashed markings
    ctx.setLineDash([20, 24]);
    ctx.strokeStyle = "#d4af3770";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(roadCenter, horizonY);
    ctx.lineTo(width * 0.5, height);
    ctx.stroke();
    ctx.restore();

    // 360° Reticle overlay & Compass Bar
    ctx.strokeStyle = "#d4af3740";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#f4c430";
    ctx.fillRect(width / 2 - 1, height / 2 - 8, 2, 16);
    ctx.fillRect(width / 2 - 8, height / 2 - 1, 16, 2);

    // Compass Tape at top of viewport
    const tapeY = 32;
    ctx.fillStyle = "#0c0a08e0";
    ctx.fillRect(width / 2 - 140, tapeY - 16, 280, 28);
    ctx.strokeStyle = "#d4af37";
    ctx.strokeRect(width / 2 - 140, tapeY - 16, 280, 28);

    const cardinals = [
      { label: "N", deg: 0 },
      { label: "NE", deg: 45 },
      { label: "E", deg: 90 },
      { label: "SE", deg: 135 },
      { label: "S", deg: 180 },
      { label: "SW", deg: 225 },
      { label: "W", deg: 270 },
      { label: "NW", deg: 315 },
    ];

    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    for (const card of cardinals) {
      let diff = card.deg - heading;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      const x = width / 2 + diff * 1.5;
      if (x > width / 2 - 130 && x < width / 2 + 130) {
        ctx.fillStyle = card.label === "N" ? "#f4c430" : "#d8d0c1";
        ctx.fillText(card.label, x, tapeY + 3);
      }
    }
  }, [heading, pitch, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setHeading(h => (h - dx * 0.4 + 360) % 360);
    setPitch(p => Math.max(-25, Math.min(25, p + dy * 0.3)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    setHeading(h => (h - dx * 0.4 + 360) % 360);
    setPitch(p => Math.max(-25, Math.min(25, p + dy * 0.3)));
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const selectPreset = (preset: LandmarkPreset) => {
    setCurrentCoords(preset.coords);
    setHeading(preset.heading);
    onNavigate?.(preset.coords);
  };

  // External Street View URLs
  const googleStreetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  const mapillaryUrl = `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=17`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;

  return (
    <div className="streetview-modal-backdrop" onClick={onClose}>
      <div className="streetview-modal-container" onClick={e => e.stopPropagation()}>
        <header className="streetview-header">
          <div className="streetview-title-group">
            <span className="streetview-badge"><Navigation size={12} /> STREET VIEW 360°</span>
            <h2>{loadingAddress ? "Locating address…" : address.split(",")[0] || "Street Position"}</h2>
            <p className="streetview-sub">{address}</p>
          </div>
          <div className="streetview-actions">
            <div className="streetview-coords-pill">
              <MapPin size={12} />
              <span>{lat.toFixed(5)}°N, {lng.toFixed(5)}°E</span>
            </div>
            <button className="streetview-close-btn" onClick={onClose} aria-label="Close Street View">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 360° Interactive Canvas Viewer */}
        <div
          className="streetview-canvas-wrapper"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <canvas ref={canvasRef} className="streetview-canvas" />

          {/* Viewer Controls Overlay */}
          <div className="streetview-floating-controls">
            <div className="control-group">
              <button onClick={() => setHeading(h => (h - 30 + 360) % 360)} title="Rotate Left (30°)">
                ⟲
              </button>
              <button onClick={() => setHeading(h => (h + 30) % 360)} title="Rotate Right (30°)">
                ⟳
              </button>
              <button onClick={() => { setHeading(0); setPitch(0); }} title="Reset Compass North">
                <Compass size={14} />
              </button>
            </div>
            <div className="control-group">
              <button onClick={() => setZoom(z => Math.min(2.5, z + 0.2))} title="Zoom In">
                <ZoomIn size={14} />
              </button>
              <button onClick={() => setZoom(z => Math.max(0.7, z - 0.2))} title="Zoom Out">
                <ZoomOut size={14} />
              </button>
            </div>
          </div>

          <div className="streetview-instructions">
            <span>Drag to look around (360° Pan & Tilt) · Compass: {Math.round(heading)}° · Pitch: {Math.round(pitch)}°</span>
          </div>
        </div>

        {/* Bottom Bar: External Providers & Global Hotspot Teleport */}
        <footer className="streetview-footer">
          <div className="streetview-presets-bar">
            <span className="preset-label">GLOBAL HOTSPOTS:</span>
            <div className="preset-buttons">
              {LANDMARK_PRESETS.map(p => (
                <button
                  key={p.name}
                  className={`preset-btn ${Math.abs(p.coords[0] - lng) < 0.01 && Math.abs(p.coords[1] - lat) < 0.01 ? "active" : ""}`}
                  onClick={() => selectPreset(p)}
                >
                  {p.city} · {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="streetview-external-links">
            <span>LIVE PANORAMA PROVIDERS:</span>
            <a href={googleStreetViewUrl} target="_blank" rel="noreferrer" className="ext-btn">
              Google Street View <ExternalLink size={11} />
            </a>
            <a href={mapillaryUrl} target="_blank" rel="noreferrer" className="ext-btn">
              Mapillary Open Street Imagery <ExternalLink size={11} />
            </a>
            <a href={osmUrl} target="_blank" rel="noreferrer" className="ext-btn">
              OpenStreetMap Detail <ExternalLink size={11} />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
