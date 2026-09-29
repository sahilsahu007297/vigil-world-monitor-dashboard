import React, { useState } from "react";
import type { TacticalUnit } from "./tactical-data";
import { ArrowUpRight, Zap, Radio, Clock, Cpu, HeartPulse } from "lucide-react";

interface TacticalHudProps {
  unit: TacticalUnit;
  onOpenDetails: (unit: TacticalUnit) => void;
}

export default function TacticalHud({ unit, onOpenDetails }: TacticalHudProps) {
  const [subtab, setSubtab] = useState<"performance" | "health">("performance");

  // Generate ticks for small power meter (20 ticks total)
  const powerTicks = 20;
  const filledPowerTicks = Math.round((unit.power / 100) * powerTicks);

  // Generate ticks for the big lower gauge (28 ticks total)
  const gaugeTicks = 28;
  const filledGaugeTicks = Math.round((unit.performanceGauge / 100) * gaugeTicks);

  return (
    <div className="tactical-hud-panel tactical-bracket-full">
      {/* Corner Brackets */}
      <span className="bracket-tr" />
      <span className="bracket-bl" />

      {/* Wireframe Drone Preview Box */}
      <div className="tactical-wireframe-box">
        <div className="tactical-wireframe-grid" />
        
        {/* Animated Wireframe 3D Drone SVG */}
        <svg
          className="tactical-drone-svg"
          viewBox="0 0 200 100"
          width="170"
          height="85"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1.2"
        >
          {/* Central fuselage body */}
          <ellipse cx="100" cy="50" rx="22" ry="12" stroke="#ffffff" strokeWidth="1.5" />
          <ellipse cx="100" cy="50" rx="14" ry="7" stroke="#94a3b8" strokeDasharray="2 2" />
          
          {/* Camera gimbal below */}
          <circle cx="100" cy="62" r="5" stroke="#38bdf8" strokeWidth="1.2" fill="rgba(56, 189, 248, 0.2)" />
          <line x1="100" y1="56" x2="100" y2="57" stroke="#ffffff" />
          
          {/* Quad arms (isometric perspective) */}
          {/* Front-left arm */}
          <path d="M82 46 L45 36" stroke="#94a3b8" strokeWidth="1.6" />
          {/* Front-right arm */}
          <path d="M118 46 L155 36" stroke="#94a3b8" strokeWidth="1.6" />
          {/* Rear-left arm */}
          <path d="M86 54 L55 70" stroke="#94a3b8" strokeWidth="1.6" />
          {/* Rear-right arm */}
          <path d="M114 54 L145 70" stroke="#94a3b8" strokeWidth="1.6" />

          {/* Landing skids */}
          <path d="M84 58 L80 72 L120 72 L116 58" stroke="#64748b" strokeWidth="1.2" fill="none" />

          {/* Motor hubs & rotor circles */}
          {/* Front-left rotor */}
          <ellipse cx="45" cy="36" rx="22" ry="7" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="45" cy="36" r="3" fill="#ffffff" />
          
          {/* Front-right rotor */}
          <ellipse cx="155" cy="36" rx="22" ry="7" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="155" cy="36" r="3" fill="#ffffff" />

          {/* Rear-left rotor */}
          <ellipse cx="55" cy="70" rx="20" ry="6" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="55" cy="70" r="3" fill="#ffffff" />

          {/* Rear-right rotor */}
          <ellipse cx="145" cy="70" rx="20" ry="6" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="145" cy="70" r="3" fill="#ffffff" />

          {/* Sensor beam projection lines */}
          <path d="M100 67 L88 88" stroke="rgba(56, 189, 248, 0.4)" strokeDasharray="2 3" />
          <path d="M100 67 L112 88" stroke="rgba(56, 189, 248, 0.4)" strokeDasharray="2 3" />
        </svg>

        {/* Details ↗ Link Button */}
        <button
          className="tactical-details-link"
          onClick={() => onOpenDetails(unit)}
          title="Open unit dossier"
        >
          <span>Details</span>
          <ArrowUpRight size={11} />
        </button>
      </div>

      {/* Unit Status Head */}
      <div className="tactical-hud-unit-head">
        <span className="tactical-status-indicator">
          {unit.status === "ACTIVE" && <span className="status-dot-active" />}
          {unit.status === "INACTIVE" && <span className="status-dot-inactive" />}
          {unit.status === "DISABLED" && <span className="status-dot-disabled" />}
          <span
            style={{
              color:
                unit.status === "ACTIVE"
                  ? "var(--tactical-green)"
                  : unit.status === "INACTIVE"
                  ? "var(--tactical-red)"
                  : "var(--tactical-muted)",
            }}
          >
            {unit.status}
          </span>
        </span>
        <span className="tactical-unit-title">{unit.name}</span>
      </div>

      {/* Metric Rows */}
      <div className="tactical-hud-metrics">
        {/* Power */}
        <div className="tactical-metric-row">
          <span className="metric-label">Power</span>
          <div className="metric-val">
            <span>{unit.power}%</span>
            <div className="segmented-meter-small">
              {Array.from({ length: powerTicks }).map((_, i) => (
                <span key={i} className={i < filledPowerTicks ? "filled" : ""} />
              ))}
            </div>
          </div>
        </div>

        {/* Session */}
        <div className="tactical-metric-row">
          <span className="metric-label">Session</span>
          <span className="metric-val">{unit.sessionTime}</span>
        </div>

        {/* Signal */}
        <div className="tactical-metric-row">
          <span className="metric-label">Signal</span>
          <div className="metric-val">
            <span>{unit.signal}</span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor:
                  unit.signal === "STRONG"
                    ? "var(--tactical-green)"
                    : unit.signal === "MODERATE"
                    ? "var(--tactical-amber)"
                    : "var(--tactical-red)",
                display: "inline-block",
                boxShadow:
                  unit.signal === "STRONG"
                    ? "0 0 6px var(--tactical-green)"
                    : unit.signal === "MODERATE"
                    ? "0 0 6px var(--tactical-amber)"
                    : "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Subtabs: PERFORMANCE / HEALTH */}
      <div className="tactical-subtabs">
        <button
          className={`tactical-subtab-btn ${subtab === "performance" ? "active" : ""}`}
          onClick={() => setSubtab("performance")}
        >
          PERFORMANCE
        </button>
        <button
          className={`tactical-subtab-btn ${subtab === "health" ? "active" : ""}`}
          onClick={() => setSubtab("health")}
        >
          HEALTH
        </button>
      </div>

      {/* Main Segmented Bar Gauge Box */}
      <div className="tactical-big-gauge-box">
        <div className="tactical-segmented-bar">
          {Array.from({ length: gaugeTicks }).map((_, i) => (
            <div
              key={i}
              className={`tactical-tick ${i < filledGaugeTicks ? "filled" : ""}`}
            />
          ))}
          <span className="tactical-gauge-percent">{unit.performanceGauge}%</span>
        </div>
        <div className="tactical-readout-text">
          {subtab === "performance" ? unit.statusText : `SENSORS: 100% // BATTERY HEALTH: 98% CYCLES: 142`}
        </div>
      </div>
    </div>
  );
}
