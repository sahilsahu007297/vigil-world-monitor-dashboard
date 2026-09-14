Center — The Map (dominant, fills remaining width):

Full interactive dark-mode 3D globe / 2D Mercator toggle (small globe⇄flat icon top-right of map)
Live-updating markers: red pulsing dots for conflict/breaking events, gold ship icons along shipping lanes, thin white aircraft trail lines, orange flame icons for wildfires, small yellow circles sized by magnitude for earthquakes, cable lines along seafloor routes, small chip icons for datacenters
Click any country → dossier slide-over panel opens (see below)
Click any marker → popover with headline, source, timestamp, "open evidence" link
Top-left overlay on map: "Instability Index" mini leaderboard (flag + country code + score 0-100 + trend arrow ▲▼─), top 5 shown, scrollable
Top-right overlay on map: zoom controls, layer-count summary, "As of [live timestamp]" ticker
Bottom-center overlay: a thin horizontal breaking alerts ticker — scrolling marquee of latest corroborated alerts with source attribution, red/gold left border accent per severity

Right Sidebar (collapsible, ~320px, tabbed): Tabs: Signals · Markets · Chokepoints · Feed

Signals tab: live-updating list cards — "Top Signals" (headline + source + time), "Maritime Chokepoints" mini bar list (name + disruption score 0–100 + trend), sparkline charts
Markets tab: ticker-style rows — equities (S&P, Nasdaq, VIX), crypto (BTC, ETH), energy (WTI, Brent, Nat gas), metals (Gold, Copper), FX (EUR/USD, USD/JPY) — each row: name/category tag, price, % change in green/red, tiny sparkline. Header strip: "Up 7/11 · Best CU +1.5% · Weakest BTC -1.2%"
Chokepoints tab: list of 13 straits/canals with live AIS vessel counts, week-over-week change, disruption score bar (gold-to-red gradient fill)
Feed tab: curated news feed, each item with source logo/name, headline, timestamp, category tag

Bottom Bar (thin, optional, ~32px): status strip — "5 independent alert origins active", data source attribution ticker, connection status dot (green pulsing = live)

Country Dossier (slide-over panel from the right, ~400px, triggered by clicking a country):

Country flag + name + ISO code
Big instability score (0–100) with radial gauge in gold
Score breakdown: components bar chart (political, security, economic, resilience factors — "12 fused signals per country")
AI-generated brief paragraph with inline cited headline chips
7-day timeline of scored events (mini horizontal timeline with dots)
Active signals list (news, alerts, flights, vessels near this country)
"Open full country page" link

Command Palette (⌘K modal):

Center-screen modal, black with gold border glow, search input at top
Quick-jump results: layers, countries, panels, saved views — keyboard-navigable list

Onboarding-free: dashboard loads directly with live data animating in — no tour modals, no empty states, no signup wall. First paint should already show moving map markers.

Key Feature Set to Implement (as functional UI, even if mocked/sample data initially)
Live World Map — dark themed, togglable layers listed above, marker clustering at low zoom
Instability Index — per-country 0–100 score, trend arrow, composed of 12 fused sub-signals
Maritime Chokepoints Monitor — 13 straits/canals tracked (Bab el-Mandeb, Strait of Hormuz, Suez Canal, Panama Canal, Strait of Malacca, etc.) with live AIS vessel counts and disruption scoring
Markets Panel — equities, crypto, energy, metals, FX with live-style tickers and sparklines
Breaking Alerts Pipeline — corroboration badge showing how many independent origin types confirmed an alert (news classification, keyword velocity, hotspot escalation, military surge, official siren) — "fewer alerts, real ones"
AI Correlation Engine — cards/sections showing how RISK (geopolitics) + FLOW (shipping/infra) + MACRO (markets) fuse into a single narrative; same pattern repeated for Commodities+Chokepoints+Weather, AI-infrastructure+Energy+Climate, and Cables+Outages+Trade
Country Dossier Pages — deep dive per country: risk score, AI brief with citations, timeline, active signals
Satellite Tracking — overlay showing live orbital positions (ISS, Starlink, military satellites) computed client-side
GPS Jamming Zones — RF interference heat overlay
Submarine Cable Map — cable routes with outage/threat overlay
AI Datacenter Map — datacenter locations with power/operator metadata
Protest Tracking — dual-source deduplicated protest cluster markers
Command Palette (⌘K) — universal quick-jump
Multiple "Lenses" — same shell, different default layer/panel configuration: World, Tech, Finance, Commodity, Energy, Calm
Pro upsell surfaces — soft-locked panels (Resilience layer, WM Analyst chat, Scenario Engine, Route Explorer, custom digest builder, widget builder) shown with a gold lock icon and "Upgrade" CTA rather than hidden entirely
Suggested Free & Open-Source Data Sources / APIs

Use these for realistic sample data and, where feasible in a live build, real API calls (all have free tiers):

Conflict events: ACLED (Armed Conflict Location & Event Data), UCDP (Uppsala Conflict Data Program) — both free for research/non-commercial use
Aircraft tracking: OpenSky Network API — free, open ADS-B flight data
Ship/AIS tracking: AISStream.io — free WebSocket AIS feed
Wildfires: NASA FIRMS — free active fire/thermal anomaly data
Earthquakes: USGS Earthquake API — free, real-time, no key required
Macro/economic data: FRED (Federal Reserve Economic Data) — free API key
Market/finance data: Finnhub (free tier), or alternatives like Alpha Vantage / Yahoo Finance unofficial APIs for equities, crypto, FX
Crypto prices: CoinGecko API — free, no key needed for basic tier
Weather/severe weather: Open-Meteo — completely free, no key
Satellite positions: compute client-side with an SGP4 propagator library (e.g. satellite.js) using free public TLE data from CelesTrak
Submarine cables (static reference layer): TeleGeography's public cable map data or open datasets like cable-geo on GitHub
News/headlines: RSS from public wire services (Reuters, AP, BBC, AFP where licensing permits) or GDELT Project — free global news event database
Power outages: PowerOutage.us (US-focused, free) or synthesized sample data for global
Country boundaries/map base layer: Natural Earth (public domain vector data) rendered via MapLibre GL JS (free, open-source, no API key needed — unlike Mapbox) or deck.gl for the 3D globe view
AI-generated briefs/correlation text: any LLM API of your choice, called server-side, summarizing the fused signals into short cited paragraphs

Note: rate limits and terms of use vary per source — for a Figma Make prototype, wire these in as clearly-labeled "sample data" / mock JSON matching each API's real response shape, so it's a one-step swap to live data later.