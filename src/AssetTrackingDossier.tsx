import React, { useState } from "react";
import type { TrackingAsset } from "./tracking-data";
import { SAMPLE_TRACKING_ASSETS } from "./tracking-data";
import {
  X,
  Search,
  Filter,
  MoreVertical,
  Plus,
  Ship,
  Plane,
  Truck,
  Package,
  Mail,
  Share2,
  ExternalLink,
  ChevronRight,
  Compass,
} from "lucide-react";

interface AssetTrackingDossierProps {
  selectedAsset: TrackingAsset;
  onSelectAsset: (asset: TrackingAsset) => void;
  onClose: () => void;
  onLocateOnMap?: (asset: TrackingAsset) => void;
}

export default function AssetTrackingDossier({
  selectedAsset,
  onSelectAsset,
  onClose,
  onLocateOnMap,
}: AssetTrackingDossierProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "plane" | "ship" | "ground" | "cargo">("all");
  const [activeAction, setActiveAction] = useState<"explore" | "report">("explore");

  const filteredAssets = SAMPLE_TRACKING_ASSETS.filter((item) => {
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesQuery =
      item.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.originCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.destCity.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesQuery;
  });

  return (
    <div className="glass-dossier-wrapper">
      {/* ================= LEFT COLUMN: TRACKING LIST ================= */}
      <aside className="glass-tracking-column">
        {/* Header */}
        <div className="tracking-col-header">
          <h2>Tracking list</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="glass-icon-btn" title="Filter list">
              <Filter size={15} />
            </button>
            <button className="glass-icon-btn" title="More options">
              <MoreVertical size={15} />
            </button>
          </div>
        </div>

        {/* Search & New Order CTA */}
        <div className="tracking-search-bar">
          <div className="tracking-search-input-box">
            <Search size={14} color="#94a3b8" />
            <input
              placeholder="Order ID / Asset..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="new-order-btn">
            <Plus size={14} />
            <span>New order</span>
          </button>
        </div>

        {/* Tracking Cards List */}
        <div className="tracking-cards-scroll">
          {filteredAssets.map((asset) => {
            const isSelected = asset.id === selectedAsset.id;
            return (
              <div
                key={asset.id}
                className={`glass-tracking-card ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onSelectAsset(asset);
                  onLocateOnMap?.(asset);
                }}
              >
                {/* Card Top: Tracking Number & Status Badge */}
                <div className="tracking-card-head">
                  <strong className="tracking-card-id">{asset.trackingNumber}</strong>
                  <span
                    className="tracking-status-badge"
                    style={{
                      color: asset.statusColor,
                      backgroundColor: `${asset.statusColor}18`,
                      borderColor: `${asset.statusColor}33`,
                    }}
                  >
                    {asset.status}
                  </span>
                </div>

                {/* Route Endpoints with Icon */}
                <div className="tracking-card-route">
                  <div className="route-endpoint left">
                    <span className="code">{asset.originCode}</span>
                    <span className="city">{asset.originCity}, {asset.originCountry}</span>
                    <small className="date">{asset.scheduledDep}</small>
                  </div>

                  <div className="route-connector">
                    <span className="connector-duration">{asset.durationText.split(" ")[0]}</span>
                    <div className="connector-line">
                      <span className="dot" />
                      <span className="line" />
                      <span className="transport-icon">
                        {asset.type === "ship" ? <Ship size={12} /> : asset.type === "plane" ? <Plane size={12} /> : <Truck size={12} />}
                      </span>
                      <span className="line" />
                      <span className="dot" />
                    </div>
                  </div>

                  <div className="route-endpoint right">
                    <span className="code">{asset.destCode}</span>
                    <span className="city">{asset.destCity}, {asset.destCountry}</span>
                    <small className="date">{asset.estimatedArr || asset.scheduledArr}</small>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Transport Filter Pill at Bottom of list */}
        <div className="transport-filter-pill-bar">
          <button
            className={filterType === "all" ? "active" : ""}
            onClick={() => setFilterType("all")}
          >
            All
          </button>
          <button
            className={filterType === "plane" ? "active" : ""}
            onClick={() => setFilterType("plane")}
            title="Air Cargo"
          >
            <Plane size={13} />
          </button>
          <button
            className={filterType === "ship" ? "active" : ""}
            onClick={() => setFilterType("ship")}
            title="Maritime Vessels"
          >
            <Ship size={13} />
          </button>
          <button
            className={filterType === "ground" ? "active" : ""}
            onClick={() => setFilterType("ground")}
            title="Ground Logistics"
          >
            <Truck size={13} />
          </button>
          <button
            className={filterType === "cargo" ? "active" : ""}
            onClick={() => setFilterType("cargo")}
            title="Intermodal Containers"
          >
            <Package size={13} />
          </button>
        </div>
      </aside>

      {/* ================= CENTER-LEFT COLUMN: ASSET INSPECTION DOSSIER ================= */}
      <section className="glass-dossier-column">
        {/* Top Header Bar */}
        <div className="dossier-top-meta">
          <div className="dossier-status-live">
            <span className="dossier-pulse-dot" />
            <span>{selectedAsset.status} · {selectedAsset.dateStr}</span>
          </div>
          <button className="dossier-close-btn" onClick={onClose} aria-label="Close dossier">
            <X size={16} />
          </button>
        </div>

        <h1 className="dossier-asset-title">{selectedAsset.trackingNumber}</h1>

        {/* Realistic Illustration Section (Container Ship or Airplane) */}
        <div className="dossier-illustration-frame">
          {selectedAsset.type === "ship" ? (
            /* High-fidelity modern container ship illustration in profile */
            <svg
              viewBox="0 0 460 160"
              className="dossier-svg-illustration"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="ship-hull-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="60%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="ocean-water-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Ocean water surface & wake */}
              <path
                d="M10,135 Q120,132 230,135 Q340,138 450,135 L450,155 L10,155 Z"
                fill="url(#ocean-water-grad)"
              />
              <path
                d="M20,135 L440,135"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                opacity="0.8"
              />

              {/* Ship Main Hull */}
              {/* Bow flare (left) to stern (right) */}
              <path
                d="M40,95 L65,135 L405,135 L425,105 L420,95 L370,95 L40,95 Z"
                fill="url(#ship-hull-grad)"
                stroke="#64748b"
                strokeWidth="1.2"
              />
              {/* Bulbous bow underwater trace */}
              <ellipse cx="48" cy="133" rx="10" ry="4" fill="#0284c7" opacity="0.6" />

              {/* Waterline stripe */}
              <path d="M60,130 L408,130" stroke="#ef4444" strokeWidth="2.5" />

              {/* Superstructure Bridge (Aft) */}
              <g transform="translate(345, 45)">
                {/* Multi-tier bridge tower */}
                <rect x="0" y="20" width="45" height="30" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
                <rect x="5" y="6" width="35" height="15" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                {/* Bridge windows */}
                <rect x="8" y="9" width="29" height="4" fill="#0284c7" />
                {/* Exhaust Funnel with Maersk blue accent */}
                <rect x="18" y="-10" width="12" height="16" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
                <rect x="18" y="-12" width="12" height="3" fill="#0f172a" />
                {/* Radar Mast & Comms dome */}
                <line x1="24" y1="-12" x2="24" y2="-25" stroke="#94a3b8" strokeWidth="1.5" />
                <line x1="16" y1="-20" x2="32" y2="-20" stroke="#94a3b8" strokeWidth="1.2" />
                <circle cx="24" cy="-26" r="2.5" fill="#ffffff" />
              </g>

              {/* Forward Lookout Mast */}
              <line x1="75" y1="95" x2="75" y2="70" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="70" y1="78" x2="80" y2="78" stroke="#94a3b8" strokeWidth="1" />

              {/* Stacked Intermodal Cargo Containers (Colorful realistic blocks) */}
              {/* Bay 1 */}
              <g transform="translate(90, 52)">
                <rect x="0" y="0" width="38" height="14" fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" />
                <rect x="0" y="14" width="38" height="14" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.5" />
                <rect x="0" y="28" width="38" height="14" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5" />
              </g>

              {/* Bay 2 */}
              <g transform="translate(132, 40)">
                <rect x="0" y="0" width="38" height="13" fill="#10b981" stroke="#059669" strokeWidth="0.5" />
                <rect x="0" y="13" width="38" height="13" fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" />
                <rect x="0" y="26" width="38" height="13" fill="#64748b" stroke="#475569" strokeWidth="0.5" />
                <rect x="0" y="39" width="38" height="13" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.5" />
              </g>

              {/* Bay 3 */}
              <g transform="translate(174, 38)">
                <rect x="0" y="0" width="38" height="14" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5" />
                <rect x="0" y="14" width="38" height="14" fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" />
                <rect x="0" y="28" width="38" height="14" fill="#10b981" stroke="#059669" strokeWidth="0.5" />
                <rect x="0" y="42" width="38" height="14" fill="#64748b" stroke="#475569" strokeWidth="0.5" />
              </g>

              {/* Bay 4 */}
              <g transform="translate(216, 40)">
                <rect x="0" y="0" width="38" height="13" fill="#64748b" stroke="#475569" strokeWidth="0.5" />
                <rect x="0" y="13" width="38" height="13" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
                <rect x="0" y="26" width="38" height="13" fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" />
                <rect x="0" y="39" width="38" height="13" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5" />
              </g>

              {/* Bay 5 */}
              <g transform="translate(258, 48)">
                <rect x="0" y="0" width="38" height="15" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.5" />
                <rect x="0" y="15" width="38" height="15" fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" />
                <rect x="0" y="30" width="38" height="15" fill="#10b981" stroke="#059669" strokeWidth="0.5" />
              </g>

              {/* Bay 6 */}
              <g transform="translate(300, 56)">
                <rect x="0" y="0" width="38" height="13" fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" />
                <rect x="0" y="13" width="38" height="13" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5" />
                <rect x="0" y="26" width="38" height="13" fill="#64748b" stroke="#475569" strokeWidth="0.5" />
              </g>

              {/* Container vertical ribbing effect */}
              <path
                d="M90,66 H338 M90,80 H338 M90,94 H338"
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="1"
              />
            </svg>
          ) : (
            /* High-fidelity modern twin-jet cargo airliner illustration */
            <svg
              viewBox="0 0 460 160"
              className="dossier-svg-illustration"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="plane-fuselage" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="70%" stopColor="#e2e8f0" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>
              </defs>

              {/* Fuselage */}
              <path
                d="M40,82 Q80,72 260,70 L390,75 L430,40 L435,42 L410,85 L435,88 L390,98 L240,96 Q80,94 40,82 Z"
                fill="url(#plane-fuselage)"
                stroke="#64748b"
                strokeWidth="1.2"
              />
              {/* Cockpit windshield */}
              <path d="M50,78 Q60,76 70,77 L68,81 Z" fill="#0284c7" />
              {/* Cargo door outline */}
              <rect x="90" y="77" width="22" height="15" fill="none" stroke="#64748b" strokeWidth="0.75" />

              {/* Main Swept Wing */}
              <polygon points="180,88 280,135 305,133 245,88" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />

              {/* High-Bypass Turbofan Engine */}
              <ellipse cx="225" cy="115" rx="20" ry="9" fill="#475569" stroke="#334155" strokeWidth="1" />
              <ellipse cx="210" cy="115" rx="5" ry="8" fill="#1e293b" />
              <path d="M210,111 L235,111" stroke="#38bdf8" strokeWidth="1.5" />

              {/* Horizontal Stabilizer (Aft) */}
              <polygon points="380,84 425,92 420,95 375,88" fill="#94a3b8" />
            </svg>
          )}
        </div>

        {/* Carrier / Operator Badge */}
        <div className="dossier-operator-bar">
          <div className="operator-logo-circle">
            {/* 8-point compass star */}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" />
            </svg>
          </div>
          <div className="operator-info">
            <span className="operator-name">{selectedAsset.operator}</span>
            <span className="operator-coords">{selectedAsset.coordinatesText}</span>
          </div>
        </div>

        {/* Route Schedule Card */}
        <div className="dossier-route-schedule-card">
          <div className="route-sched-col">
            <div className="sched-city-title">
              <strong>{selectedAsset.originCity}, {selectedAsset.originCountry}</strong>
              <span className="sched-pill">{selectedAsset.originCode}</span>
            </div>
            <div className="sched-times">
              <div className="time-row">
                <span>Scheduled</span>
                <strong>{selectedAsset.scheduledDep}</strong>
              </div>
              <div className="time-row">
                <span>Actual</span>
                <strong style={{ color: "#38bdf8" }}>{selectedAsset.actualDep}</strong>
              </div>
            </div>
          </div>

          <div className="sched-arrow-icon">
            <ChevronRight size={18} color="#64748b" />
          </div>

          <div className="route-sched-col">
            <div className="sched-city-title">
              <strong>{selectedAsset.destCity}, {selectedAsset.destCountry}</strong>
              <span className="sched-pill">{selectedAsset.destCode}</span>
            </div>
            <div className="sched-times">
              <div className="time-row">
                <span>Scheduled</span>
                <strong>{selectedAsset.scheduledArr}</strong>
              </div>
              <div className="time-row">
                <span>Estimated</span>
                <strong style={{ color: "#34d399" }}>{selectedAsset.estimatedArr}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Route Progress Bar */}
        <div className="dossier-route-progress-card">
          <div className="progress-top-label">
            <span>Route</span>
            <span className="on-the-way">ON THE WAY: <strong>{selectedAsset.durationText}</strong></span>
          </div>

          {/* Segmented Cyan/Green Progress Bar */}
          <div className="segmented-route-bar">
            <div
              className="route-bar-fill"
              style={{ width: `${selectedAsset.progressPercent}%` }}
            />
          </div>

          <div className="progress-endpoints-row">
            <div className="endpoint-flag-badge">
              <span className="flag-icon">{selectedAsset.originFlag}</span>
              <span className="flag-code">{selectedAsset.originCode}</span>
              <small>{selectedAsset.originCity}, {selectedAsset.originCountry}</small>
            </div>

            <div className="endpoint-flag-badge right">
              <span className="flag-icon">{selectedAsset.destFlag}</span>
              <span className="flag-code">{selectedAsset.destCode}</span>
              <small>{selectedAsset.destCity}, {selectedAsset.destCountry}</small>
            </div>
          </div>
        </div>

        {/* Personnel / Agent Contact Card */}
        <div className="dossier-agent-card">
          <div className="agent-profile-row">
            <div className="agent-avatar">
              <span>{selectedAsset.agentName.slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="agent-details">
              <strong>{selectedAsset.agentName}</strong>
              <span>{selectedAsset.agentRole}</span>
            </div>
            <button className="agent-contact-btn">
              <Mail size={13} />
              <span>Contact</span>
            </button>
          </div>

          <div className="agent-meta-grid">
            <div>
              <span className="meta-lbl">CASE ID</span>
              <strong className="meta-val">{selectedAsset.caseId}</strong>
            </div>
            <div>
              <span className="meta-lbl">SHIPMENT</span>
              <strong className="meta-val">{selectedAsset.trackingNumber}</strong>
            </div>
            <div>
              <span className="meta-lbl">ROUTE</span>
              <strong className="meta-val">{selectedAsset.originCode} → {selectedAsset.destCode}</strong>
            </div>
            <div>
              <span className="meta-lbl">ETA CONFIDENCE</span>
              <strong className="meta-val" style={{ color: "#34d399" }}>
                {selectedAsset.etaConfidence}
              </strong>
            </div>
          </div>
        </div>

        {/* Cargo Details Card */}
        <div className="dossier-cargo-card">
          <div className="cargo-info-left">
            <span className="cargo-label">Cargo Details</span>
            <div className="cargo-metric">
              <span>TOTAL WEIGHT</span>
              <strong>{selectedAsset.totalWeight}</strong>
            </div>
            <p className="cargo-description">{selectedAsset.cargoDescription}</p>
          </div>

          <div className="cargo-preview-box">
            {/* 3D isometric cargo container vector preview */}
            <svg viewBox="0 0 100 80" width="85" height="68">
              <polygon points="10,25 50,10 90,25 50,40" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
              <polygon points="10,25 50,40 50,75 10,60" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
              <polygon points="50,40 90,25 90,60 50,75" fill="#0369a1" stroke="#075985" strokeWidth="1" />
              {/* Ridges */}
              <line x1="20" y1="28" x2="20" y2="63" stroke="#38bdf8" opacity="0.4" />
              <line x1="30" y1="32" x2="30" y2="67" stroke="#38bdf8" opacity="0.4" />
              <line x1="40" y1="36" x2="40" y2="71" stroke="#38bdf8" opacity="0.4" />
            </svg>
          </div>
        </div>

        {/* Bottom CTA Actions */}
        <div className="dossier-actions-row">
          <button
            className={`dossier-btn-explore ${activeAction === "explore" ? "active" : ""}`}
            onClick={() => {
              setActiveAction("explore");
              onLocateOnMap?.(selectedAsset);
            }}
          >
            <span>Explore</span>
          </button>

          <button
            className={`dossier-btn-ai ${activeAction === "report" ? "active" : ""}`}
            onClick={() => setActiveAction("report")}
          >
            <span>AI Report</span>
          </button>

          <button className="dossier-btn-icon" title="Share Tracking Link">
            <Share2 size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
