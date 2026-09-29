import React from "react";
import { MapPin, Clock, Search, Layers, Shield, Radio } from "lucide-react";

interface SurveilTrackHeaderProps {
  activeNav: "BRIEF" | "UNIT MAP" | "SETUP" | "VELOX AERO";
  onSelectNav: (nav: "BRIEF" | "UNIT MAP" | "SETUP" | "VELOX AERO") => void;
  filterMode: "City" | "District" | "Street";
  onSelectFilter: (mode: "City" | "District" | "Street") => void;
  currentTime: Date;
  locationName: string;
  onOpenCommand: () => void;
  onOpenNews: () => void;
  onOpenSatellites: () => void;
}

export default function SurveilTrackHeader({
  activeNav,
  onSelectNav,
  filterMode,
  onSelectFilter,
  currentTime,
  locationName,
  onOpenCommand,
  onOpenNews,
  onOpenSatellites,
}: SurveilTrackHeaderProps) {
  // Format military style time: e.g. "2:30 AM" or "02:30 AM"
  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <header className="surveil-topbar">
      {/* Decorative Outer Corner Brackets */}
      <div className="surveil-topbar-bracket-left" />
      <div className="surveil-topbar-bracket-right" />

      {/* Brand */}
      <div
        className="surveil-brand"
        style={{ cursor: "pointer" }}
        onClick={() => onSelectNav("UNIT MAP")}
      >
        <div className="surveil-logo-icon">
          <span />
          <span />
          <span />
          <span />
        </div>
        <span>SurveilTrack</span>
      </div>

      {/* Center Nav Items */}
      <nav className="surveil-nav">
        {(["BRIEF", "UNIT MAP", "SETUP", "VELOX AERO"] as const).map((navItem) => (
          <button
            key={navItem}
            className={`surveil-nav-btn ${activeNav === navItem ? "active" : ""}`}
            onClick={() => onSelectNav(navItem)}
          >
            {navItem}
          </button>
        ))}
      </nav>

      {/* Sub-filter Pills: City | District | Street */}
      <div className="surveil-filter-bar">
        {(["City", "District", "Street"] as const).map((mode) => (
          <button
            key={mode}
            className={`surveil-filter-pill ${filterMode === mode ? "active" : ""}`}
            onClick={() => onSelectFilter(mode)}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Right Meta Info */}
      <div className="surveil-meta">
        {/* Search trigger */}
        <button
          onClick={onOpenCommand}
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--tactical-border)",
            color: "var(--tactical-muted)",
            padding: "5px 10px",
            borderRadius: "3px",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
          }}
          title="Command Palette"
        >
          <Search size={12} />
          <span>⌘K</span>
        </button>

        {/* Location */}
        <div className="surveil-location">
          <MapPin size={13} color="var(--tactical-muted)" />
          <span>{locationName.toUpperCase()}</span>
        </div>

        {/* Live Clock */}
        <div className="surveil-time">
          <Clock size={13} color="var(--tactical-muted)" />
          <span>{formattedTime}</span>
        </div>
      </div>
    </header>
  );
}
