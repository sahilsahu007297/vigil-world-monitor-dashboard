# Flights and public cameras

Open **SEARCH FLIGHTS** or the Aviation tab for exact callsign, registration, ICAO hex, and aircraft-type searches. Results open an aircraft dossier inside the dashboard. Pan the map to load receiver-reported aircraft within 250 nautical miles of the center. The feed refreshes every 30 seconds; sample planes and decorative predicted paths have been removed.

Airplanes.live is attempted first. During verification it rejected project access and its browser response lacked CORS headers. Its provider asks for the project URL and description at contact@airplanes.live. No email has been sent. Until access is granted, ADSB.lol supplies clearly attributed fallback data. Its public API is accessed through a fixed, validated server route to handle browser CORS, with a 15-second cache and serialized requests. Neither provider guarantees global coverage or scheduled route information.

Open **EXPLORE PUBLIC CAMERAS** or the Cameras tab. The dashboard first loads the open `/api/cctv?region=all` aggregator, which fans out across public traffic authorities and open webcam indexes in North America, Europe, Asia, Africa, Latin America, Australia, and New Zealand. NYC Open Data / DOT, Singapore LTA, London TfL, and Finland Digitraffic are also loaded directly as keyless fallbacks. Search loaded camera names, streets, cities, countries, and providers; load additional results with “Show 50 more.” Camera availability still depends on each participating provider and is not guaranteed for every street or city. An optional Windy Webcams key adds another worldwide provider and embedded live/timelapse players; it is held only in component memory.

The Aviation layer uses the server-backed `/api/flights` aggregation (OpenSky plus ADS-B fallbacks) every 30 seconds. Its `military_flights` and `commercial_flights` arrays are normalized separately before rendering, so the layer counts and aviation tab reflect the current response rather than a client-only regional request.

## Running and deployment

- Development: the existing Vite server includes `/public-feeds/aircraft/...` automatically.
- Set `FLIGHT_API_CONTACT` to your public project URL or contact email before starting Vite or the production server. ADSB.lol rejects generic server User-Agent headers and requires contact information. This value is sent only in provider request headers; no email is sent. Without it, the fallback explains the missing configuration.
- Production: use Node 24+, run `npm run build`, then `npm start` (default port 8443; configurable with `PORT`). This serves `dist` and the aircraft route.
- Static-only deployments must separately host the route in `server/public-feeds.ts` and forward `/public-feeds/aircraft/*` to it. Uploading `dist` alone does not provide the aircraft API route.
- The production server also preserves the existing `/api/*` global-feed provider. Availability of unrelated feeds depends on that existing service.

## Verification

`npx tsc --noEmit`, `npm run build`, and `npm run test:feeds` (with Vite running). Playwright uses installed Microsoft Edge. Browser tests mock provider responses to verify fallback attribution, zero-valued telemetry, empty search results, and snapshot viewing. Public endpoint/browser smoke checks are separate because coverage and availability change.

Source links and licenses are in `THIRD_PARTY_NOTICES.md`.
