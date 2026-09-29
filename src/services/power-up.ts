// In-App POWER UP Provider Credentials & Settings Manager

export interface ProviderKeyStatus {
  cesiumIon: boolean;
  googleMaps: boolean;
  aisstream: boolean;
  nasaFirms: boolean;
  tomtom: boolean;
  openai: boolean;
  openskyAuth: boolean;
}

export interface ProviderDefinition {
  id: keyof ProviderKeyStatus;
  envKey: string;
  name: string;
  category: "3D & Terrain" | "Maritime" | "Wildfires" | "Traffic" | "Voice AI" | "Aviation";
  costTier: "FREE SIGNUP" | "METERED / PAID" | "OPTIONAL";
  signupUrl: string;
  unlocks: string;
  isBrowserSafe: boolean;
}

export const PROVIDERS_CATALOG: ProviderDefinition[] = [
  {
    id: "cesiumIon",
    envKey: "CESIUM_ION_TOKEN",
    name: "Cesium Ion Token",
    category: "3D & Terrain",
    costTier: "FREE SIGNUP",
    signupUrl: "https://cesium.com/ion",
    unlocks: "Google Photorealistic 3D Tiles, Cesium World Terrain, Global 3D Buildings",
    isBrowserSafe: true,
  },
  {
    id: "googleMaps",
    envKey: "GOOGLE_MAPS_KEY",
    name: "Google Maps Platform API Key",
    category: "3D & Terrain",
    costTier: "METERED / PAID",
    signupUrl: "https://console.cloud.google.com/google/maps-apis",
    unlocks: "Direct Google 3D Tiles sessions + Google Place Search Autocomplete",
    isBrowserSafe: true,
  },
  {
    id: "aisstream",
    envKey: "AISSTREAM_API_KEY",
    name: "AISStream WebSocket Key",
    category: "Maritime",
    costTier: "FREE SIGNUP",
    signupUrl: "https://aisstream.io",
    unlocks: "Real-time global commercial vessel tracking, cargo manifests, MMSI positions",
    isBrowserSafe: false,
  },
  {
    id: "nasaFirms",
    envKey: "FIRMS_MAP_KEY",
    name: "NASA FIRMS Map Key",
    category: "Wildfires",
    costTier: "FREE SIGNUP",
    signupUrl: "https://firms.modaps.eosdis.nasa.gov/api/map_key/",
    unlocks: "MODIS & VIIRS 375m high-resolution active thermal anomaly fire detections",
    isBrowserSafe: false,
  },
  {
    id: "tomtom",
    envKey: "TOMTOM_API_KEY",
    name: "TomTom Traffic API Key",
    category: "Traffic",
    costTier: "FREE SIGNUP",
    signupUrl: "https://developer.tomtom.com",
    unlocks: "Live highway traffic speeds, congestion delays, and road incident geometry",
    isBrowserSafe: false,
  },
  {
    id: "openai",
    envKey: "OPENAI_API_KEY",
    name: "OpenAI API Key",
    category: "Voice AI",
    costTier: "METERED / PAID",
    signupUrl: "https://platform.openai.com",
    unlocks: "Hands-free voice operator agent (Realtime API) + AI HUD visual summary readouts",
    isBrowserSafe: false,
  },
  {
    id: "openskyAuth",
    envKey: "OPENSKY_CLIENT_ID",
    name: "OpenSky Network OAuth Credentials",
    category: "Aviation",
    costTier: "FREE SIGNUP",
    signupUrl: "https://opensky-network.org",
    unlocks: "High-rate flight polling quota (5s refresh interval vs 15s anonymous)",
    isBrowserSafe: false,
  },
];

const LOCAL_STORAGE_KEY = "vigil_powerup_keys";

export function getStoredClientKeys(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredClientKeys(keys: Record<string, string>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(keys));
  } catch {}
}

export async function fetchProviderStatus(): Promise<ProviderKeyStatus> {
  try {
    const res = await fetch("/api/powerup/status");
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {}

  const localKeys = getStoredClientKeys();
  return {
    cesiumIon: !!localKeys.CESIUM_ION_TOKEN,
    googleMaps: !!localKeys.GOOGLE_MAPS_KEY,
    aisstream: !!localKeys.AISSTREAM_API_KEY,
    nasaFirms: !!localKeys.FIRMS_MAP_KEY,
    tomtom: !!localKeys.TOMTOM_API_KEY,
    openai: !!localKeys.OPENAI_API_KEY,
    openskyAuth: !!localKeys.OPENSKY_CLIENT_ID,
  };
}

export async function saveKeysToServer(newKeys: Record<string, string>): Promise<{ ok: boolean; message?: string }> {
  // Store browser-safe keys locally
  saveStoredClientKeys(newKeys);

  // Sync to server proxy to write to .env.local
  try {
    const res = await fetch("/api/powerup/save-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newKeys),
    });
    if (res.ok) {
      return { ok: true };
    }
    return { ok: false, message: `Server returned ${res.status}` };
  } catch (err: any) {
    // If backend proxy isn't available, local client keys still work for browser-safe APIs
    return { ok: true, message: "Saved in client storage (server sync offline)" };
  }
}
