import React, { useState } from "react";
import type { GlobalFlight } from "./services/global-feeds";
import {
  ArrowLeftRight,
  Plane,
  Search,
  Filter,
  BarChart2,
  Calendar,
  Check,
  ChevronRight,
  User,
  X,
  Info,
} from "lucide-react";

interface VeloxFlightDashboardProps {
  onClose: () => void;
  liveFlights?: GlobalFlight[];
  onSelectFlight?: (f: GlobalFlight) => void;
}

export default function VeloxFlightDashboard({
  onClose,
  liveFlights = [],
  onSelectFlight,
}: VeloxFlightDashboardProps) {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [selectedSeats, setSelectedSeats] = useState<string[]>(["D1", "E1"]);
  const [origin, setOrigin] = useState("JFK");
  const [destination, setDestination] = useState("MXP");

  const toggleSeat = (seatId: string) => {
    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((s) => s !== seatId)
        : [...prev, seatId]
    );
  };

  const calculateTotal = () => {
    return (selectedSeats.length * 450).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });
  };

  return (
    <div className="velox-container">
      {/* Top Header Bar */}
      <div className="velox-header">
        {/* Brand & Pill Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 800,
              fontSize: "18px",
              color: "#ffffff",
            }}
          >
            <span
              style={{
                width: "20px",
                height: "20px",
                backgroundColor: "var(--velox-emerald)",
                clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
                display: "inline-block",
              }}
            />
            Velox
          </div>

          <nav className="velox-nav">
            {["Dashboard", "My Bookings", "Loyalty Program", "Support", "Settings"].map(
              (item) => (
                <button
                  key={item}
                  className={`velox-nav-pill ${activeNav === item ? "active" : ""}`}
                  onClick={() => setActiveNav(item)}
                >
                  {item}
                </button>
              )
            )}
          </nav>
        </div>

        {/* User bar & Close */}
        <div className="velox-user-bar">
          <div className="velox-search-box">
            <Search size={14} color="var(--velox-text-dim)" />
            <input placeholder="Search..." />
            <span className="velox-kbd">⌘ + Space</span>
          </div>

          <button
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--velox-card-border)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              color: "#ffffff",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
            title="Filters"
          >
            <Filter size={15} />
          </button>

          {/* User profile */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              NT
            </div>
            <div style={{ fontSize: "11px", lineHeight: "1.2" }}>
              <div style={{ color: "var(--velox-text-dim)", fontSize: "10px" }}>
                @tom_dawson
              </div>
              <div style={{ fontWeight: 600, color: "#ffffff" }}>Noah Turner</div>
            </div>
          </div>

          {/* Exit / Return to Tactical Command Center */}
          <button
            onClick={onClose}
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fca5a5",
              padding: "6px 12px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginLeft: "12px",
            }}
          >
            <X size={13} />
            <span>EXIT AERO</span>
          </button>
        </div>
      </div>

      {/* Main Dashboard Section Title */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, color: "#ffffff" }}>
          Dashboard
        </h1>
        <div style={{ fontSize: "12px", color: "var(--velox-text-dim)" }}>
          Commercial & Tactical Air Corridor Monitor
        </div>
      </div>

      {/* 3-Column Velox Layout */}
      <div className="velox-dashboard-grid">
        {/* ================= COLUMN 1: ROUTE & UPCOMING FLIGHT ================= */}
        <div>
          {/* Route Booking Card */}
          <div className="velox-card velox-route-card">
            <div className="velox-route-endpoints">
              <div className="velox-endpoint">
                <span>From</span>
                <h2>{origin}</h2>
                <span>New York</span>
              </div>

              <div
                className="velox-swap-icon"
                onClick={() => {
                  setOrigin(destination);
                  setDestination(origin);
                }}
                style={{ cursor: "pointer" }}
                title="Swap origin and destination"
              >
                <ArrowLeftRight size={15} />
              </div>

              <div className="velox-endpoint" style={{ textAlign: "right" }}>
                <span>To</span>
                <h2>{destination}</h2>
                <span>Milan</span>
              </div>
            </div>

            <div className="velox-date-row">
              <div className="velox-date-item">
                <span>Departure Date</span>
                <strong>Mon, 20 Jan</strong>
              </div>
              <div className="velox-date-item" style={{ textAlign: "right" }}>
                <span>Return Date</span>
                <strong>Thu, 30 Jan</strong>
              </div>
            </div>

            <button className="velox-search-btn">Search Ticket (34)</button>
          </div>

          {/* Upcoming Flight Card */}
          <div className="velox-card velox-upcoming-card">
            <div className="velox-airline-badge">
              <span style={{ color: "#ef4444", fontWeight: 800 }}>AIRFRANCE /</span>
              <span style={{ color: "var(--velox-text-dim)", fontSize: "11px" }}>CX785</span>
            </div>

            <div className="velox-flight-airports">
              <div>
                <span>Paris</span>
                <strong>CDG</strong>
                <span style={{ color: "#ffffff", fontSize: "10px", marginTop: "2px" }}>
                  10:30 AM
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                <Plane size={18} color="var(--velox-emerald)" style={{ transform: "rotate(90deg)" }} />
                <span className="velox-flight-duration">12 h 20 min</span>
              </div>

              <div style={{ textAlign: "right" }}>
                <span>Tokyo</span>
                <strong>HND</strong>
                <span style={{ color: "#ffffff", fontSize: "10px", marginTop: "2px" }}>
                  6:50 AM
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: "10px",
                marginTop: "4px",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--velox-text-dim)" }}>
                Business Class
              </span>
              <strong style={{ fontSize: "15px", color: "#ffffff" }}>$450.00</strong>
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2: FLIGHT RADAR & HOT PROPOSITIONS ================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Flight Radar Arc Card */}
          <div className="velox-card velox-radar-card">
            <svg
              className="velox-radar-canvas"
              viewBox="0 0 600 240"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <linearGradient id="arc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#fb923c" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>

              {/* Simplified World Continents Silhouettes */}
              <g fill="rgba(255, 255, 255, 0.05)" stroke="none">
                {/* North America */}
                <path d="M40,30 Q120,40 180,90 Q160,160 80,180 Q30,120 40,30 Z" />
                {/* Europe */}
                <path d="M350,50 Q450,40 480,90 Q440,140 370,120 Q330,80 350,50 Z" />
                {/* Africa */}
                <path d="M360,140 Q430,150 440,210 Q370,240 340,190 Z" />
              </g>

              {/* Glowing Trajectory Arc */}
              <path
                d="M170,120 Q300,30 420,110"
                fill="none"
                stroke="url(#arc-grad)"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />

              {/* Origin Dot (New York) */}
              <circle cx="170" cy="120" r="5" fill="#f97316" />
              <circle cx="170" cy="120" r="10" fill="none" stroke="#f97316" opacity="0.4" />

              {/* In-Flight Airplane Marker */}
              <g transform="translate(295, 68)">
                <circle cx="0" cy="0" r="12" fill="#f97316" />
                <path
                  d="M-4,-2 L0,-7 L4,-2 L8,-2 L1,3 L3,8 L0,6 L-3,8 L-1,3 L-8,-2 Z"
                  fill="#ffffff"
                  transform="rotate(65)"
                />
              </g>

              {/* Destination Dot (Milan) */}
              <circle cx="420" cy="110" r="5" fill="#10b981" />
              <circle cx="420" cy="110" r="10" fill="none" stroke="#10b981" opacity="0.4" />
            </svg>

            {/* Flight Labels over the radar */}
            <div className="velox-flight-badge-orange">New York · Departure 6:30 PM</div>
            <div className="velox-flight-badge-green">Milan · Arrival 08:15 AM</div>

            {/* Bottom Distance Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                zIndex: 2,
                marginTop: "auto",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: "10px",
              }}
            >
              <div>
                <span style={{ fontSize: "10px", color: "var(--velox-text-dim)" }}>
                  Distance to arrival:
                </span>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>
                  2 368 / 6 470 km
                </div>
              </div>

              <div
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid var(--velox-emerald)",
                  color: "var(--velox-emerald)",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                Currently Flying
              </div>
            </div>
          </div>

          {/* Hot Propositions / Live Flights Card */}
          <div className="velox-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>
                Hot Propositions
              </h3>
              <span style={{ fontSize: "11px", color: "var(--velox-emerald)" }}>
                Live Corridor Feeds
              </span>
            </div>

            <table className="velox-propositions-table">
              <thead>
                <tr>
                  <th>Airline / Flight</th>
                  <th>Departure</th>
                  <th>Duration</th>
                  <th>Arrival</th>
                  <th style={{ textAlign: "right" }}>Ticket Price</th>
                </tr>
              </thead>
              <tbody>
                <tr className="velox-flight-row">
                  <td>
                    <strong style={{ color: "#ffffff", display: "block" }}>Singapore Airlines</strong>
                    <span style={{ color: "var(--velox-text-dim)", fontSize: "10px" }}>#SQ-8754-2024</span>
                  </td>
                  <td>06:45 AM<br/><small style={{ color: "var(--velox-text-dim)" }}>JKTC</small></td>
                  <td>5h 10m<br/><small style={{ color: "var(--velox-text-dim)" }}>2 stops</small></td>
                  <td>06:45 AM<br/><small style={{ color: "var(--velox-text-dim)" }}>JKTC</small></td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#ffffff" }}>$1,250</td>
                </tr>

                <tr className="velox-flight-row">
                  <td>
                    <strong style={{ color: "#ffffff", display: "block" }}>British Airways</strong>
                    <span style={{ color: "var(--velox-text-dim)", fontSize: "10px" }}>#BA-2048-2024</span>
                  </td>
                  <td>09:20 AM<br/><small style={{ color: "var(--velox-text-dim)" }}>JFK</small></td>
                  <td>13h 25m<br/><small style={{ color: "var(--velox-text-dim)" }}>1 stop</small></td>
                  <td>10:45 PM<br/><small style={{ color: "var(--velox-text-dim)" }}>LHR</small></td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#ffffff" }}>$870</td>
                </tr>

                <tr className="velox-flight-row">
                  <td>
                    <strong style={{ color: "#ffffff", display: "block" }}>Qantas Airways</strong>
                    <span style={{ color: "var(--velox-text-dim)", fontSize: "10px" }}>#QF-7810-2024</span>
                  </td>
                  <td>02:20 PM<br/><small style={{ color: "var(--velox-text-dim)" }}>SYD</small></td>
                  <td>13h 30m<br/><small style={{ color: "var(--velox-text-dim)" }}>1 stop</small></td>
                  <td>05:10 PM<br/><small style={{ color: "var(--velox-text-dim)" }}>LAX</small></td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#ffffff" }}>$1,350</td>
                </tr>

                {/* Integration with real live ADS-B flights if available */}
                {liveFlights.slice(0, 2).map((flight) => (
                  <tr
                    key={flight.icao24}
                    className="velox-flight-row"
                    onClick={() => onSelectFlight?.(flight)}
                  >
                    <td>
                      <strong style={{ color: "#ffffff", display: "block" }}>
                        {flight.callsign || flight.airline_code || "Global ADS-B"}
                      </strong>
                      <span style={{ color: "var(--velox-emerald)", fontSize: "10px" }}>
                        {flight.model || flight.type || "Live Air Asset"}
                      </span>
                    </td>
                    <td>{flight.speed_knots ? `${Math.round(flight.speed_knots)} kt` : "Cruising"}</td>
                    <td>{flight.alt ? `${Math.round(flight.alt)} m` : "Level"}</td>
                    <td>{flight.category || "Commercial"}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--velox-emerald)" }}>
                      TRACK ↗
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= COLUMN 3: SELECT SEATS CABIN ================= */}
        <div className="velox-card velox-seat-selector">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#ffffff" }}>
              Select Seats
            </h3>
            <Info size={14} color="var(--velox-text-dim)" />
          </div>

          {/* Airplane Fuselage Layout */}
          <div className="velox-fuselage-graphic">
            <span className="velox-cabin-class-pill">Business</span>

            {/* Seat Column Labels */}
            <div className="velox-seat-grid" style={{ marginBottom: "6px" }}>
              <span className="velox-seat-col-label">A</span>
              <span className="velox-seat-col-label">B</span>
              <span className="velox-seat-col-label">C</span>
              <span /> {/* Aisle */}
              <span className="velox-seat-col-label">D</span>
              <span className="velox-seat-col-label">E</span>
              <span className="velox-seat-col-label">F</span>
            </div>

            {/* Rows 1 to 4 */}
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="velox-seat-grid" style={{ marginBottom: "6px" }}>
                {["A", "B", "C"].map((col) => {
                  const id = `${col}${row}`;
                  const isSelected = selectedSeats.includes(id);
                  const isOccupied = id === "A1" || id === "F2" || id === "A3";
                  return (
                    <div
                      key={id}
                      className={`velox-seat-item ${isSelected ? "selected" : ""} ${
                        isOccupied ? "occupied" : ""
                      }`}
                      onClick={() => !isOccupied && toggleSeat(id)}
                    >
                      {isSelected ? <Check size={12} /> : id}
                    </div>
                  );
                })}

                {/* Aisle Row number */}
                <span
                  style={{
                    fontSize: "9px",
                    color: "var(--velox-text-dim)",
                    textAlign: "center",
                    lineHeight: "28px",
                  }}
                >
                  {row}
                </span>

                {["D", "E", "F"].map((col) => {
                  const id = `${col}${row}`;
                  const isSelected = selectedSeats.includes(id);
                  const isOccupied = id === "F1" || id === "D4";
                  return (
                    <div
                      key={id}
                      className={`velox-seat-item ${isSelected ? "selected" : ""} ${
                        isOccupied ? "occupied" : ""
                      }`}
                      onClick={() => !isOccupied && toggleSeat(id)}
                    >
                      {isSelected ? <Check size={12} /> : id}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Passenger & Selection Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              fontSize: "11px",
              padding: "10px 14px",
              background: "rgba(14, 30, 26, 0.6)",
              borderRadius: "12px",
              border: "1px solid var(--velox-card-border)",
            }}
          >
            <div>
              <span style={{ color: "var(--velox-text-dim)", fontSize: "9px", display: "block" }}>
                Passengers
              </span>
              <strong style={{ color: "#ffffff" }}>{selectedSeats.length} people</strong>
            </div>
            <div>
              <span style={{ color: "var(--velox-text-dim)", fontSize: "9px", display: "block" }}>
                Class
              </span>
              <strong style={{ color: "#ffffff" }}>Business</strong>
            </div>
            <div>
              <span style={{ color: "var(--velox-text-dim)", fontSize: "9px", display: "block" }}>
                Seat
              </span>
              <strong style={{ color: "var(--velox-orange)" }}>
                {selectedSeats.join(", ") || "None"}
              </strong>
            </div>
          </div>

          {/* Checkout Bar */}
          <div className="velox-checkout-bar">
            <span>Checkout</span>
            <button className="velox-checkout-btn">
              <span>${calculateTotal()}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
