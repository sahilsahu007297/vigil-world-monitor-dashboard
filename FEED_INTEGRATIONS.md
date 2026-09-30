# Public feeds

The dashboard reads public satellite positions from `/public-feeds/satellites`. The server propagates a CelesTrak orbital catalog with SGP4 and refreshes the elements when available. The displayed count is the number of computed positions, not a fixed estimate.

The Cameras tab combines the public `/public-feeds/osiris/cctv` catalog with NYC Open Data / DOT, Singapore LTA, London TfL, and Finland Digitraffic. Search or filter the returned catalog and reveal 100 more results at a time. Selecting a camera opens its published snapshot, clip, HLS stream, or provider player in the dashboard. Street View is a separate action in the camera viewer. Availability depends on each provider; a published location does not guarantee a working stream.

The Aviation layer uses `/public-feeds/osiris/flights` plus the regional ADS-B fallback. Other enabled live layers use the public feed routes under `/public-feeds/*`. Counts represent returned records; an em dash means that a source is unavailable. Geographic reference layers carry a `REF` badge.

The dashboard has no API key setup UI or credential saving endpoint. `FLIGHT_API_CONTACT` may still be set as a public project contact in `.env.local` for the ADSB.lol request header.

## Run and verify

- Node 24+: `npm run build`, then `npm start` (default port 8443).
- `npx tsc --noEmit` checks types; `npm run test:feed-server` checks the local public feed routes.
- A static `dist` upload must also host the handlers in `server/public-feeds.ts` or the Vercel function in `api/public-feeds.ts`.

Provider credits and licenses are in `THIRD_PARTY_NOTICES.md`.
