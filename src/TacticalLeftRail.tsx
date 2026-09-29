import React from "react";
import {
  LayoutGrid,
  Crosshair,
  Shield,
  Target,
  Lock,
  Users,
  Headphones,
  Sliders,
  Settings,
  Tv,
} from "lucide-react";

export type RailMode =
  | "drone"
  | "shield"
  | "targets"
  | "cyber"
  | "intel"
  | "comms"
  | "grid";

interface TacticalLeftRailProps {
  activeMode: RailMode;
  onSelectMode: (mode: RailMode) => void;
  onOpenLiveTv: () => void;
  onOpenSettings: () => void;
}

export default function TacticalLeftRail({
  activeMode,
  onSelectMode,
  onOpenLiveTv,
  onOpenSettings,
}: TacticalLeftRailProps) {
  return (
    <aside className="tactical-rail">
      {/* Top Section */}
      <div className="tactical-rail-top">
        {/* 9-dot grid icon */}
        <button
          className={`tactical-rail-btn ${activeMode === "grid" ? "active" : ""}`}
          onClick={() => onSelectMode("grid")}
          title="Overview & Layer Matrix"
          aria-label="Overview & Layer Matrix"
        >
          <LayoutGrid size={18} />
        </button>

        {/* Drone tracking HUD (Selected with reticle square) */}
        <button
          className={`tactical-rail-btn ${activeMode === "drone" ? "active" : ""}`}
          onClick={() => onSelectMode("drone")}
          title="UAV / Tactical Units HUD"
          aria-label="UAV / Tactical Units HUD"
        >
          {/* Custom drone / crosshair symbol */}
          <Crosshair size={19} />
        </button>

        {/* Defense / Conflicts */}
        <button
          className={`tactical-rail-btn ${activeMode === "shield" ? "active" : ""}`}
          onClick={() => onSelectMode("shield")}
          title="Defense & Conflict Theaters"
          aria-label="Defense & Conflict Theaters"
        >
          <Shield size={18} />
        </button>

        {/* Target Reticle / Threats */}
        <button
          className={`tactical-rail-btn ${activeMode === "targets" ? "active" : ""}`}
          onClick={() => onSelectMode("targets")}
          title="Target Acquisitions & Seismic Hazards"
          aria-label="Target Acquisitions & Seismic Hazards"
        >
          <Target size={18} />
        </button>

        {/* Lock / Cyber threats */}
        <button
          className={`tactical-rail-btn ${activeMode === "cyber" ? "active" : ""}`}
          onClick={() => onSelectMode("cyber")}
          title="Cyber Security & Infrastructure"
          aria-label="Cyber Security & Infrastructure"
        >
          <Lock size={17} />
        </button>

        {/* Intel / Personnel */}
        <button
          className={`tactical-rail-btn ${activeMode === "intel" ? "active" : ""}`}
          onClick={() => onSelectMode("intel")}
          title="Personnel & Intelligence Desks"
          aria-label="Personnel & Intelligence Desks"
        >
          <Users size={18} />
        </button>

        {/* Headset / Comms / Intercepts */}
        <button
          className={`tactical-rail-btn ${activeMode === "comms" ? "active" : ""}`}
          onClick={() => onSelectMode("comms")}
          title="Signal Intercepts & Radio Feeds"
          aria-label="Signal Intercepts & Radio Feeds"
        >
          <Headphones size={18} />
        </button>
      </div>

      {/* Bottom Section */}
      <div className="tactical-rail-bottom">
        {/* User avatar */}
        <div className="tactical-avatar" title="Operator Profile">
          <span>OP</span>
        </div>

        {/* Audio mixer / Broadcast sliders */}
        <button
          className="tactical-rail-btn"
          onClick={onOpenLiveTv}
          title="Live Broadcast & Feeds"
          aria-label="Live Broadcast & Feeds"
        >
          <Sliders size={17} />
        </button>

        {/* Settings */}
        <button
          className="tactical-rail-btn"
          onClick={onOpenSettings}
          title="System Setup"
          aria-label="System Setup"
        >
          <Settings size={17} />
        </button>
      </div>
    </aside>
  );
}
