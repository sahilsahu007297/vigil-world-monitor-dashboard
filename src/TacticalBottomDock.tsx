import React, { useState } from "react";
import type { TacticalUnit } from "./tactical-data";
import { ArrowUpRight, BarChart2, Activity, ShieldAlert, MessageSquare, ListFilter } from "lucide-react";

interface TacticalBottomDockProps {
  units: TacticalUnit[];
  activeUnit: TacticalUnit;
  onSelectUnit: (unit: TacticalUnit) => void;
  onOpenDetails: (unit: TacticalUnit) => void;
}

export default function TacticalBottomDock({
  units,
  activeUnit,
  onSelectUnit,
  onOpenDetails,
}: TacticalBottomDockProps) {
  const [activeTab, setActiveTab] = useState<
    "Unit list" | "Statistics" | "Performances" | "Overview" | "Messages"
  >("Unit list");

  return (
    <div className="tactical-bottom-dock">
      {/* Dock Tabs Strip */}
      <div className="tactical-dock-tabs">
        {(["Unit list", "Statistics", "Performances", "Overview", "Messages"] as const).map(
          (tabName) => (
            <button
              key={tabName}
              className={`tactical-dock-tab ${activeTab === tabName ? "active" : ""}`}
              onClick={() => setActiveTab(tabName)}
            >
              {tabName}
            </button>
          )
        )}
      </div>

      {/* Dock Content */}
      <div className="tactical-dock-content">
        {activeTab === "Unit list" && (
          <>
            {units.map((u) => {
              const isSelected = u.id === activeUnit.id;
              return (
                <div
                  key={u.id}
                  className={`tactical-unit-card ${isSelected ? "active" : ""}`}
                  onClick={() => onSelectUnit(u)}
                >
                  {/* Status Indicator */}
                  {u.status === "ACTIVE" && <span className="status-dot-active" />}
                  {u.status === "INACTIVE" && <span className="status-dot-inactive" />}
                  {u.status === "DISABLED" && <span className="status-dot-disabled" />}

                  <span
                    style={{
                      color:
                        u.status === "ACTIVE"
                          ? "var(--tactical-green)"
                          : u.status === "INACTIVE"
                          ? "var(--tactical-red)"
                          : "var(--tactical-muted)",
                      fontWeight: 700,
                    }}
                  >
                    {u.status}
                  </span>

                  <span style={{ color: isSelected ? "#ffffff" : "#d1d5db" }}>
                    {u.name}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetails(u);
                    }}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                    title="Open Unit Details"
                  >
                    <ArrowUpRight size={13} className="card-external-icon" />
                  </button>
                </div>
              );
            })}
          </>
        )}

        {activeTab === "Statistics" && (
          <div style={{ display: "flex", gap: "28px", padding: "4px 8px", fontFamily: "var(--font-tactical-mono)", fontSize: "11px", color: "#9ca3af" }}>
            <div><span style={{ color: "var(--tactical-muted)" }}>FLEET READY:</span> <strong style={{ color: "#ffffff" }}>5 / 7 UNITS</strong></div>
            <div><span style={{ color: "var(--tactical-muted)" }}>AIRBORNE HOURS:</span> <strong style={{ color: "#ffffff" }}>14.8 HRS TODAY</strong></div>
            <div><span style={{ color: "var(--tactical-muted)" }}>SENSOR COVERAGE:</span> <strong style={{ color: "#ffffff" }}>94.2 SQ KM</strong></div>
            <div><span style={{ color: "var(--tactical-muted)" }}>ENCRYPTED LINK:</span> <strong style={{ color: "var(--tactical-green)" }}>AES-256 ACTIVE</strong></div>
            <div><span style={{ color: "var(--tactical-muted)" }}>GRID SYNCHRONIZATION:</span> <strong style={{ color: "#ffffff" }}>100% NOMINAL</strong></div>
          </div>
        )}

        {activeTab === "Performances" && (
          <div style={{ display: "flex", gap: "28px", padding: "4px 8px", fontFamily: "var(--font-tactical-mono)", fontSize: "11px", color: "#9ca3af" }}>
            <div><span style={{ color: "var(--tactical-muted)" }}>OPTICAL LATENCY:</span> <strong style={{ color: "#ffffff" }}>18 MS</strong></div>
            <div><span style={{ color: "var(--tactical-muted)" }}>AVERAGE BATTERY:</span> <strong style={{ color: "#ffffff" }}>78.4%</strong></div>
            <div><span style={{ color: "var(--tactical-muted)" }}>UPLINK BANDWIDTH:</span> <strong style={{ color: "#ffffff" }}>48.2 MBPS</strong></div>
            <div><span style={{ color: "var(--tactical-muted)" }}>GIMBAL DRIFT:</span> <strong style={{ color: "var(--tactical-green)" }}>&lt; 0.02°</strong></div>
            <div><span style={{ color: "var(--tactical-muted)" }}>GPS CONSTELLATION:</span> <strong style={{ color: "#ffffff" }}>18 SATS LOCKED</strong></div>
          </div>
        )}

        {activeTab === "Overview" && (
          <div style={{ display: "flex", gap: "28px", padding: "4px 8px", fontFamily: "var(--font-tactical-mono)", fontSize: "11px", color: "#9ca3af" }}>
            <div><span style={{ color: "var(--tactical-muted)" }}>THEATER POSTURE:</span> <strong style={{ color: "var(--tactical-amber)" }}>ELEVATED PATROL</strong></div>
            <div><span style={{ color: "var(--tactical-muted)" }}>ACTIVE TARGETS:</span> <strong style={{ color: "#ffffff" }}>4 VERIFIED</strong></div>
            <div><span style={{ color: "var(--tactical-muted)" }}>RADAR SWEEP CADENCE:</span> <strong style={{ color: "#ffffff" }}>3.2 SECONDS</strong></div>
            <div><span style={{ color: "var(--tactical-muted)" }}>AUTOMATED PATROL:</span> <strong style={{ color: "var(--tactical-green)" }}>WAYPOINTS ENGAGED</strong></div>
          </div>
        )}

        {activeTab === "Messages" && (
          <div style={{ display: "flex", gap: "24px", padding: "4px 8px", fontFamily: "var(--font-tactical-mono)", fontSize: "11px", color: "#cbd5e1" }}>
            <div><span style={{ color: "var(--tactical-green)" }}>[02:29:40]</span> AEC-4200: Battery pack 1 temp nominal at 31°C.</div>
            <div><span style={{ color: "var(--tactical-amber)" }}>[02:28:12]</span> IUH-305: Financial District microwave link retrying.</div>
            <div><span style={{ color: "var(--tactical-green)" }}>[02:25:01]</span> APD-7100: Brooklyn transit corridor clear.</div>
            <div><span style={{ color: "var(--tactical-muted)" }}>[02:20:15]</span> COMMAND: Surveillance grid telemetry synchronized.</div>
          </div>
        )}
      </div>
    </div>
  );
}
