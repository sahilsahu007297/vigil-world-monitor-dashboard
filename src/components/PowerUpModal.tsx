import { useEffect, useState } from "react";
import {
  PROVIDERS_CATALOG,
  fetchProviderStatus,
  getStoredClientKeys,
  saveKeysToServer,
  type ProviderDefinition,
  type ProviderKeyStatus,
} from "../services/power-up";
import { Zap, Key, ShieldCheck, ExternalLink, CheckCircle2, AlertCircle, RefreshCw, X, Lock } from "lucide-react";

interface PowerUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysUpdated?: () => void;
}

export default function PowerUpModal({ isOpen, onClose, onKeysUpdated }: PowerUpModalProps) {
  const [status, setStatus] = useState<ProviderKeyStatus>({
    cesiumIon: false,
    googleMaps: false,
    aisstream: false,
    nasaFirms: false,
    tomtom: false,
    openai: false,
    openskyAuth: false,
  });

  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    if (!isOpen) return;
    const clientKeys = getStoredClientKeys();
    setInputValues(clientKeys);
    fetchProviderStatus().then(setStatus);
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ["All", "3D & Terrain", "Maritime", "Wildfires", "Traffic", "Voice AI", "Aviation"];

  const filteredProviders = PROVIDERS_CATALOG.filter((p) => {
    if (activeCategory === "All") return true;
    return p.category === activeCategory;
  });

  const handleInputChange = (envKey: string, val: string) => {
    setInputValues((prev) => ({ ...prev, [envKey]: val }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await saveKeysToServer(inputValues);
      if (res.ok) {
        setSaveMessage("✓ Credentials securely saved. Services refreshed.");
        const updated = await fetchProviderStatus();
        setStatus(updated);
        if (onKeysUpdated) onKeysUpdated();
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        setSaveMessage(`Save note: ${res.message || "Saved locally"}`);
      }
    } catch (err: any) {
      setSaveMessage("Saved to client storage.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = Object.values(status).filter(Boolean).length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(3, 7, 18, 0.78)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "92%",
          maxWidth: "840px",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          background: "rgba(11, 18, 32, 0.94)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "24px",
          boxShadow: "0 24px 70px rgba(0,0,0,0.8), 0 0 40px rgba(56, 189, 248, 0.1)",
          overflow: "hidden",
          animation: "scaleIn 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(234, 179, 8, 0.25) 0%, rgba(245, 158, 11, 0.1) 100%)",
                border: "1px solid rgba(234, 179, 8, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#eab308",
                boxShadow: "0 0 16px rgba(234, 179, 8, 0.2)",
              }}
            >
              <Zap size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.01em" }}>
                  POWER UP — Advanced Telemetry Credentials
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "rgba(56, 189, 248, 0.14)",
                    color: "#38bdf8",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                  }}
                >
                  {activeCount} / {PROVIDERS_CATALOG.length} Keys Active
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                Zero keys required to boot. Enter optional tokens to unlock photorealistic 3D, live AIS ships & thermal fire layers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Pills Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "12px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            background: "rgba(7, 12, 22, 0.4)",
            overflowX: "auto",
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: "8px",
                border: activeCategory === cat ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                background: activeCategory === cat ? "rgba(56, 189, 248, 0.16)" : "rgba(255, 255, 255, 0.03)",
                color: activeCategory === cat ? "#38bdf8" : "#94a3b8",
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredProviders.map((provider) => {
            const isKeyConfigured = !!status[provider.id] || !!inputValues[provider.envKey];
            const isShown = !!showKey[provider.envKey];

            return (
              <div
                key={provider.id}
                style={{
                  padding: "16px 18px",
                  borderRadius: "16px",
                  background: "rgba(18, 26, 42, 0.65)",
                  border: isKeyConfigured ? "1px solid rgba(56, 189, 248, 0.28)" : "1px solid rgba(255, 255, 255, 0.07)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  transition: "border-color 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>{provider.name}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: provider.costTier === "FREE SIGNUP" ? "rgba(34, 197, 94, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: provider.costTier === "FREE SIGNUP" ? "#4ade80" : "#f59e0b",
                          border: `1px solid ${provider.costTier === "FREE SIGNUP" ? "rgba(34, 197, 94, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                        }}
                      >
                        {provider.costTier}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: provider.isBrowserSafe ? "rgba(148, 163, 184, 0.12)" : "rgba(168, 85, 247, 0.15)",
                          color: provider.isBrowserSafe ? "#94a3b8" : "#c084fc",
                        }}
                        title={provider.isBrowserSafe ? "Browser safe token" : "Protected server-side proxy secret"}
                      >
                        {provider.isBrowserSafe ? "Public Client Token" : "🛡️ Server Proxied Secret"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                      <strong style={{ color: "#e2e8f0" }}>Unlocks:</strong> {provider.unlocks}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {isKeyConfigured ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4ade80", fontWeight: 600 }}>
                        <CheckCircle2 size={14} /> Active
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
                        Free Degraded Fallback
                      </span>
                    )}

                    <a
                      href={provider.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11,
                        color: "#38bdf8",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        padding: "4px 8px",
                        borderRadius: "6px",
                        background: "rgba(56, 189, 248, 0.1)",
                        border: "1px solid rgba(56, 189, 248, 0.2)",
                      }}
                    >
                      Get Key <ExternalLink size={11} />
                    </a>
                  </div>
                </div>

                {/* Key Input */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <input
                      type={isShown ? "text" : "password"}
                      value={inputValues[provider.envKey] || ""}
                      onChange={(e) => handleInputChange(provider.envKey, e.target.value)}
                      placeholder={`Enter ${provider.envKey} (optional)`}
                      style={{
                        width: "100%",
                        padding: "8px 36px 8px 12px",
                        fontSize: 12,
                        fontFamily: "monospace",
                        background: "rgba(7, 12, 22, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        color: "#f8fafc",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((prev) => ({ ...prev, [provider.envKey]: !prev[provider.envKey] }))}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#64748b",
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                    >
                      {isShown ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(7, 12, 22, 0.8)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
              <Lock size={12} /> Secrets stored in gitignored .env.local — never logged.
            </span>
            {saveMessage && (
              <span style={{ fontSize: 12, color: "#38bdf8", fontWeight: 600 }}>{saveMessage}</span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                color: "#94a3b8",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              Close
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: "8px 20px",
                fontSize: 12,
                fontWeight: 700,
                color: "#020617",
                background: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
                border: "none",
                borderRadius: "10px",
                cursor: isSaving ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 0 20px rgba(56, 189, 248, 0.35)",
              }}
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              {isSaving ? "Saving..." : "Save & Apply Credentials"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
