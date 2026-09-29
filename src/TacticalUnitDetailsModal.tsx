import React from "react";
import type { TacticalUnit } from "./tactical-data";
import { X, Battery, Radio, Shield, Navigation, Wind, Activity, Video } from "lucide-react";

interface TacticalUnitDetailsModalProps {
  unit: TacticalUnit;
  onClose: () => void;
}

export default function TacticalUnitDetailsModal({
  unit,
  onClose,
}: TacticalUnitDetailsModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 100 }}>
      <div
        className="tactical-bracket-full"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "640px",
          maxWidth: "92vw",
          background: "#0f1116",
          border: "1px solid #323947",
          boxShadow: "0 25px 60px rgba(0,0,0,0.9)",
          padding: "24px",
          fontFamily: "var(--font-tactical-mono)",
          position: "relative",
          color: "#e5e7eb",
        }}
      >
        <span className="bracket-tr" />
        <span className="bracket-bl" />

        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1px solid #232833",
            paddingBottom: "14px",
            marginBottom: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--tactical-muted)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              UAV TACTICAL SURVEILLANCE DOSSIER
            </div>
            <h2
              style={{
                margin: "4px 0 0",
                fontSize: "20px",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.04em",
              }}
            >
              {unit.name} · <span style={{ color: "var(--tactical-green)" }}>{unit.callsign}</span>
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#161921",
            padding: "8px 12px",
            border: "1px solid #282f3d",
            fontSize: "11px",
            marginBottom: "16px",
          }}
        >
          <div>
            <span style={{ color: "var(--tactical-muted)" }}>STATUS: </span>
            <strong
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
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--tactical-muted)" }}>SECTOR: </span>
            <strong style={{ color: "#ffffff" }}>{unit.sector}</strong>
          </div>
          <div>
            <span style={{ color: "var(--tactical-muted)" }}>LINK: </span>
            <strong style={{ color: "var(--tactical-green)" }}>{unit.frequency}</strong>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            fontSize: "11px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              background: "#12141a",
              border: "1px solid #232833",
              padding: "12px",
            }}
          >
            <div style={{ color: "var(--tactical-muted)", marginBottom: "4px" }}>PLATFORM MODEL</div>
            <strong style={{ color: "#ffffff", fontSize: "13px" }}>{unit.model}</strong>
          </div>

          <div
            style={{
              background: "#12141a",
              border: "1px solid #232833",
              padding: "12px",
            }}
          >
            <div style={{ color: "var(--tactical-muted)", marginBottom: "4px" }}>SENSOR PAYLOAD</div>
            <strong style={{ color: "#ffffff", fontSize: "13px" }}>{unit.cameraFeed}</strong>
          </div>

          <div
            style={{
              background: "#12141a",
              border: "1px solid #232833",
              padding: "12px",
            }}
          >
            <div style={{ color: "var(--tactical-muted)", marginBottom: "4px" }}>CURRENT ALTITUDE</div>
            <strong style={{ color: "#ffffff", fontSize: "13px" }}>{unit.altitude}</strong>
          </div>

          <div
            style={{
              background: "#12141a",
              border: "1px solid #232833",
              padding: "12px",
            }}
          >
            <div style={{ color: "var(--tactical-muted)", marginBottom: "4px" }}>AIRSPEED</div>
            <strong style={{ color: "#ffffff", fontSize: "13px" }}>{unit.speed}</strong>
          </div>

          <div
            style={{
              background: "#12141a",
              border: "1px solid #232833",
              padding: "12px",
            }}
          >
            <div style={{ color: "var(--tactical-muted)", marginBottom: "4px" }}>GPS COORDINATES</div>
            <strong style={{ color: "#ffffff", fontSize: "13px" }}>
              {unit.lat.toFixed(4)}°N, {Math.abs(unit.lon).toFixed(4)}°W
            </strong>
          </div>

          <div
            style={{
              background: "#12141a",
              border: "1px solid #232833",
              padding: "12px",
            }}
          >
            <div style={{ color: "var(--tactical-muted)", marginBottom: "4px" }}>BATTERY RESERVE</div>
            <strong style={{ color: "var(--tactical-green)", fontSize: "13px" }}>
              {unit.power}% ({unit.sessionTime} ELAPSED)
            </strong>
          </div>
        </div>

        {/* Live Simulation Feed Preview */}
        <div
          style={{
            background: "#090a0d",
            border: "1px solid #252b36",
            padding: "14px",
            marginBottom: "16px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "10px",
              color: "var(--tactical-muted)",
              marginBottom: "8px",
            }}
          >
            <span>LIVE OPTICAL TELEMETRY STREAM</span>
            <span style={{ color: "var(--tactical-green)" }}>● 1080P60 FLIR ENC</span>
          </div>

          <div
            style={{
              height: "120px",
              background: "radial-gradient(circle at center, #1b2823 0%, #0d1210 90%)",
              border: "1px solid #1f332a",
              display: "grid",
              placeItems: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Crosshairs */}
            <div
              style={{
                position: "absolute",
                width: "40px",
                height: "40px",
                border: "1px solid rgba(34, 197, 94, 0.4)",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "1px",
                background: "rgba(34, 197, 94, 0.15)",
              }}
            />
            <div
              style={{
                position: "absolute",
                height: "100%",
                width: "1px",
                background: "rgba(34, 197, 94, 0.15)",
              }}
            />
            <div style={{ color: "var(--tactical-green)", fontSize: "11px", zIndex: 2 }}>
              [ TARGET LOCK: {unit.sector.toUpperCase()} ]
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #374151",
              color: "#e5e7eb",
              padding: "8px 18px",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "var(--font-tactical-mono)",
            }}
          >
            CLOSE
          </button>
          <button
            onClick={() => alert(`Command signal dispatched: Return to Base for ${unit.name}`)}
            style={{
              background: "#ef4444",
              border: "none",
              color: "#ffffff",
              fontWeight: 700,
              padding: "8px 18px",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "var(--font-tactical-mono)",
            }}
          >
            COMMAND RTB
          </button>
        </div>
      </div>
    </div>
  );
}
