#!/usr/bin/env node
// VIGIL — Setup Doctor
// Checks environment health: Node version, env keys, and network reachability.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const OK = '\x1b[32m✓\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
let issues = 0;

console.log(`\n${BOLD}═══ VIGIL Doctor ═══${RESET}\n`);

// 1. Node version
const [major] = process.versions.node.split('.').map(Number);
if (major >= 18) {
  console.log(`${OK} Node.js v${process.versions.node}`);
} else {
  console.log(`${FAIL} Node.js v${process.versions.node} — requires >= 18`);
  issues++;
}

// 2. .env.local
const envPath = resolve('.env.local');
const envExists = existsSync(envPath);
if (envExists) {
  console.log(`${OK} .env.local found`);
} else {
  console.log(`${WARN} .env.local not found — copy .env.example to .env.local`);
}

// 3. Check keys (masked)
const KEYS = [
  { key: 'FLIGHT_API_CONTACT', required: true, label: 'ADSB.lol contact' },
  { key: 'CESIUM_ION_TOKEN', required: false, label: 'Cesium Ion (3D tiles)' },
  { key: 'GOOGLE_MAPS_KEY', required: false, label: 'Google Maps Platform' },
  { key: 'AISSTREAM_API_KEY', required: false, label: 'AISStream (vessels)' },
  { key: 'FIRMS_MAP_KEY', required: false, label: 'NASA FIRMS (fires)' },
  { key: 'TOMTOM_API_KEY', required: false, label: 'TomTom (traffic)' },
  { key: 'OPENAI_API_KEY', required: false, label: 'OpenAI (voice AI)' },
  { key: 'OPENSKY_CLIENT_ID', required: false, label: 'OpenSky Network' },
];

let envVars = {};
if (envExists) {
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        envVars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
      }
    }
  } catch {}
}

console.log(`\n${BOLD}API Keys:${RESET}`);
for (const { key, required, label } of KEYS) {
  const val = envVars[key] || process.env[key] || '';
  if (val) {
    const masked = val.length > 8 ? val.slice(0, 4) + '…' + val.slice(-3) : '***';
    console.log(`  ${OK} ${label}: ${masked}`);
  } else if (required) {
    console.log(`  ${FAIL} ${label}: NOT SET (required)`);
    issues++;
  } else {
    console.log(`  ${WARN} ${label}: not set (optional — keyless fallback active)`);
  }
}

// 4. Network reachability
console.log(`\n${BOLD}Network:${RESET}`);
const endpoints = [
  { url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer?f=json', name: 'Esri World Imagery' },
  { url: 'https://api.adsb.lol/v2/point/51.47/-0.46/25', name: 'ADSB.lol aircraft' },
  { url: 'https://ssd-api.jpl.nasa.gov/fireball.api?limit=1', name: 'NASA Fireball API' },
  { url: 'https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m', name: 'Open-Meteo weather' },
];

const results = await Promise.allSettled(
  endpoints.map(async (ep) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(ep.url, { signal: controller.signal });
      clearTimeout(timeout);
      return { name: ep.name, ok: res.ok, status: res.status };
    } catch (err) {
      clearTimeout(timeout);
      throw { name: ep.name, message: err.message };
    }
  })
);

for (const r of results) {
  if (r.status === 'fulfilled') {
    const { name, ok, status } = r.value;
    console.log(`  ${ok ? OK : WARN} ${name}: HTTP ${status}`);
    if (!ok) issues++;
  } else {
    const { name, message } = r.reason;
    console.log(`  ${FAIL} ${name}: ${message}`);
    issues++;
  }
}

// 5. Cesium static assets
console.log(`\n${BOLD}Cesium Assets:${RESET}`);
const cesiumPaths = ['public/cesium/Assets', 'public/cesium/Workers', 'public/cesium/Widgets', 'public/cesium/ThirdParty'];
for (const p of cesiumPaths) {
  if (existsSync(resolve(p))) {
    console.log(`  ${OK} ${p}`);
  } else {
    console.log(`  ${FAIL} ${p} — missing! Run: cp -r node_modules/cesium/Build/Cesium/{Assets,Workers,Widgets,ThirdParty} public/cesium/`);
    issues++;
  }
}

// Summary
console.log(`\n${BOLD}──────────────────────${RESET}`);
if (issues === 0) {
  console.log(`${OK} All checks passed. Run ${BOLD}npm run dev${RESET} to start.\n`);
} else {
  console.log(`${WARN} ${issues} issue(s) found. See above for details.\n`);
}
process.exit(issues > 0 ? 1 : 0);
