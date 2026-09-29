import React from "react";
import type { TacticalUnit } from "./tactical-data";
import { Plus, Minus, Layers, Compass } from "lucide-react";

interface TacticalMapCanvasProps {
  units: TacticalUnit[];
  activeUnit: TacticalUnit;
  onSelectUnit: (unit: TacticalUnit) => void;
  filterMode: "City" | "District" | "Street";
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleViewMode: () => void;
  is3dGlobe: boolean;
  children?: React.ReactNode;
}

export default function TacticalMapCanvas({
  units,
  activeUnit,
  onSelectUnit,
  filterMode,
  zoom,
  onZoomIn,
  onZoomOut,
  onToggleViewMode,
  is3dGlobe,
  children,
}: TacticalMapCanvasProps) {
  // If in 3D Globe mode, render Globe component passed as children
  if (is3dGlobe) {
    return (
      <div className="tactical-map-viewport">
        {children}
        {/* Controls */}
        <div className="tactical-map-controls">
          <button className="tactical-ctrl-btn" onClick={onZoomIn} title="Zoom In">
            <Plus size={16} />
          </button>
          <button className="tactical-ctrl-btn" onClick={onZoomOut} title="Zoom Out">
            <Minus size={16} />
          </button>
          <button
            className="tactical-ctrl-btn"
            onClick={onToggleViewMode}
            title="Switch to Tactical City Canvas"
          >
            <Layers size={15} />
          </button>
        </div>
      </div>
    );
  }

  // Active unit screen coordinates
  const activeX = activeUnit.canvasX;
  const activeY = activeUnit.canvasY;

  return (
    <div className="tactical-map-viewport">
      {/* 3D Isometric City SVG Canvas */}
      <div className="isometric-city-canvas">
        <svg
          viewBox="0 0 1000 650"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
        >
          <defs>
            {/* Water gradient */}
            <radialGradient id="water-grad" cx="40%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#101319" />
              <stop offset="60%" stopColor="#08090c" />
              <stop offset="100%" stopColor="#040507" />
            </radialGradient>

            {/* Building shading */}
            <linearGradient id="bldg-top" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#252932" />
              <stop offset="100%" stopColor="#181b22" />
            </linearGradient>
            <linearGradient id="bldg-side-dark" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#14171d" />
              <stop offset="100%" stopColor="#0b0d11" />
            </linearGradient>
            <linearGradient id="bldg-side-light" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2d3340" />
              <stop offset="100%" stopColor="#15181f" />
            </linearGradient>

            {/* Glowing road trace filter */}
            <filter id="glow-road" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Water Surface */}
          <rect width="1000" height="650" fill="url(#water-grad)" />

          {/* Tactical Coordinate Grid Mesh */}
          <g opacity="0.12" stroke="#4a5568" strokeWidth="0.75" strokeDasharray="3 6">
            {Array.from({ length: 15 }).map((_, i) => (
              <line key={`v-${i}`} x1={i * 70} y1="0" x2={i * 70} y2="650" />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={i * 70} x2="1000" y2={i * 70} />
            ))}
          </g>

          {/* Coastlines & Pier Outlines (Manhattan Lower Tip, East River, Brooklyn Shore) */}
          <g stroke="#374151" strokeWidth="1.5" fill="#0d0f14">
            {/* Lower Manhattan tip landmass */}
            <path
              d="M380,240 L450,220 L580,200 L760,180 L880,220 L820,380 L760,520 L680,590 L560,560 L440,490 L400,380 Z"
              fill="#101217"
              stroke="#4b5563"
            />
            {/* Battery Park shoreline curve */}
            <path
              d="M400,380 Q430,470 450,490 Q480,520 540,540 Q620,560 700,530"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1.5"
            />
            {/* Brooklyn / Queens waterfront */}
            <path
              d="M840,400 L950,370 L1000,420 L960,600 L860,640 L820,530 Z"
              fill="#0d0f13"
              stroke="#374151"
            />
            {/* Brooklyn & Manhattan Bridges */}
            {/* Brooklyn Bridge */}
            <line x1="720" y1="480" x2="880" y2="430" stroke="#4b5563" strokeWidth="3" />
            <line x1="720" y1="480" x2="880" y2="430" stroke="#9ca3af" strokeWidth="1" strokeDasharray="2 4" />
            {/* Manhattan Bridge */}
            <line x1="760" y1="440" x2="940" y2="390" stroke="#4b5563" strokeWidth="2.5" />
            <line x1="760" y1="440" x2="940" y2="390" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2 3" />
          </g>

          {/* Glowing Vector Street Grids */}
          <g stroke="#64748b" strokeWidth="0.9" fill="none" opacity="0.65" filter="url(#glow-road)">
            {/* Broadway artery */}
            <path d="M440,490 L520,410 L600,320 L690,250 L780,200" stroke="#94a3b8" strokeWidth="1.2" />
            {/* West Side Highway & FDR Drive */}
            <path d="M410,380 L440,480 L480,520 L580,540 L700,510 L780,440 L840,360" stroke="#cbd5e1" strokeWidth="1.4" />
            {/* Cross streets grid */}
            <path d="M460,460 L540,480 M480,430 L570,450 M510,400 L610,420 M540,370 L640,390 M570,340 L680,360 M600,310 L720,330" />
            <path d="M480,460 L620,330 M520,480 L670,350 M560,510 L720,370 M600,520 L760,390" />
          </g>

          {/* 3D Isometric Buildings Cluster (Monochrome Obsidian Architecture) */}
          <g>
            {/* Downtown Skyscraper 1 (One WTC silhouette) */}
            <g transform="translate(480, 310)">
              {/* Left face */}
              <polygon points="0,0 24,12 24,140 0,128" fill="url(#bldg-side-dark)" stroke="#374151" strokeWidth="0.5" />
              {/* Right face */}
              <polygon points="24,12 48,0 48,128 24,140" fill="url(#bldg-side-light)" stroke="#4b5563" strokeWidth="0.5" />
              {/* Roof */}
              <polygon points="0,0 24,-12 48,0 24,12" fill="url(#bldg-top)" stroke="#9ca3af" strokeWidth="0.75" />
              {/* Spire */}
              <line x1="24" y1="-12" x2="24" y2="-45" stroke="#ffffff" strokeWidth="1.2" />
              <circle cx="24" cy="-45" r="1.5" fill="#ef4444" />
            </g>

            {/* Skyscraper 2 (Wall St Highrise) */}
            <g transform="translate(560, 340)">
              <polygon points="0,0 28,14 28,110 0,96" fill="url(#bldg-side-dark)" stroke="#2d3340" strokeWidth="0.5" />
              <polygon points="28,14 56,0 56,96 28,110" fill="url(#bldg-side-light)" stroke="#3f4757" strokeWidth="0.5" />
              <polygon points="0,0 28,-14 56,0 28,14" fill="url(#bldg-top)" stroke="#6b7280" strokeWidth="0.75" />
            </g>

            {/* Skyscraper 3 */}
            <g transform="translate(620, 280)">
              <polygon points="0,0 20,10 20,95 0,85" fill="url(#bldg-side-dark)" />
              <polygon points="20,10 40,0 40,85 20,95" fill="url(#bldg-side-light)" />
              <polygon points="0,0 20,-10 40,0 20,10" fill="url(#bldg-top)" stroke="#9ca3af" strokeWidth="0.5" />
            </g>

            {/* Skyscraper 4 */}
            <g transform="translate(510, 390)">
              <polygon points="0,0 22,11 22,80 0,69" fill="url(#bldg-side-dark)" />
              <polygon points="22,11 44,0 44,69 22,80" fill="url(#bldg-side-light)" />
              <polygon points="0,0 22,-11 44,0 22,11" fill="url(#bldg-top)" />
            </g>

            {/* Skyscraper 5 */}
            <g transform="translate(680, 240)">
              <polygon points="0,0 30,15 30,130 0,115" fill="url(#bldg-side-dark)" />
              <polygon points="30,15 60,0 60,115 30,130" fill="url(#bldg-side-light)" />
              <polygon points="0,0 30,-15 60,0 30,15" fill="url(#bldg-top)" stroke="#9ca3af" strokeWidth="0.5" />
            </g>

            {/* Background block fill buildings */}
            {Array.from({ length: 22 }).map((_, i) => {
              const bx = 450 + (i % 6) * 44 + Math.sin(i) * 15;
              const by = 220 + Math.floor(i / 6) * 48 + Math.cos(i) * 12;
              const h = 40 + (i * 7) % 55;
              const w = 18 + (i % 3) * 6;
              return (
                <g key={`bldg-${i}`} transform={`translate(${bx}, ${by})`} opacity="0.9">
                  <polygon points={`0,0 ${w},${w / 2} ${w},${h} 0,${h - w / 2}`} fill="#13161c" stroke="#252a35" strokeWidth="0.4" />
                  <polygon points={`${w},${w / 2} ${w * 2},0 ${w * 2},${h - w / 2} ${w},${h}`} fill="#1b1f28" stroke="#323847" strokeWidth="0.4" />
                  <polygon points={`0,0 ${w},${-w / 2} ${w * 2},0 ${w},${w / 2}`} fill="#282e3b" stroke="#475163" strokeWidth="0.4" />
                </g>
              );
            })}
          </g>

          {/* Tactical Radar Ring centered on active unit */}
          <g transform={`translate(${activeX * 10}, ${activeY * 6.5})`}>
            <circle r="45" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" strokeDasharray="3 4" />
            <circle r="85" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.75" />
            {/* Pulsing beacon */}
            <circle r="6" fill="rgba(34, 197, 94, 0.3)" />
            <circle r="2.5" fill="#22c55e" />
          </g>

          {/* CALLOUT VECTOR LINE: Links the Active Unit to HUD Panel */}
          {/* HUD panel top-left is roughly at screen (x: 385px, y: 190px in SVG coords) */}
          <g stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.85">
            {/* Hairline from marker to HUD panel */}
            <path
              d={`M${activeX * 10},${activeY * 6.5} L${Math.max(activeX * 10 - 60, 360)},${Math.min(activeY * 6.5 - 40, 220)} L380,220`}
              strokeDasharray="4 2"
            />
            {/* Small target reticle at marker joint */}
            <circle cx={activeX * 10} cy={activeY * 6.5} r="4" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        </svg>

        {/* Tactical HTML Marker Pins positioned across the city canvas */}
        {units.map((u) => {
          const isSelected = u.id === activeUnit.id;
          return (
            <div
              key={u.id}
              className={`tactical-map-marker ${isSelected ? "active" : ""}`}
              style={{ left: `${u.canvasX}%`, top: `${u.canvasY}%` }}
              onClick={() => onSelectUnit(u)}
              title={`${u.name} · ${u.status}`}
            >
              <div className="tactical-marker-box">
                <i />
              </div>
              <div className="tactical-marker-label">
                {u.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Map Control Buttons */}
      <div className="tactical-map-controls">
        <button className="tactical-ctrl-btn" onClick={onZoomIn} title="Zoom In">
          <Plus size={16} />
        </button>
        <button className="tactical-ctrl-btn" onClick={onZoomOut} title="Zoom Out">
          <Minus size={16} />
        </button>
        <button
          className="tactical-ctrl-btn"
          onClick={onToggleViewMode}
          title={is3dGlobe ? "Switch to Tactical City Canvas" : "Switch to 3D Globe"}
        >
          <Layers size={15} />
        </button>
      </div>
    </div>
  );
}
