# react-flight-tracker

The aircraft SVG path and altitude color scale in `src/flight-map-style.ts` are adapted from https://github.com/xSNOWM4Nx/react-flight-tracker (master, inspected 2026-09-06). Its AircraftLayer GeoJSON symbol approach is adapted to the existing MapLibre map, with reported headings and selectable aircraft. This project does not bundle the upstream Mapbox/MUI application or its credential handling.

Copyright (c) 2020 Daniel Neuweiler

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.

# Data providers

- Airplanes.live: https://airplanes.live/api-docs/ — API access may require provider approval. The integration does not circumvent access restrictions.
- ADSB.lol: https://www.adsb.lol/docs/open-data/api/ — ODbL 1.0. Used as an explicitly labeled independent fallback.
- Singapore LTA / data.gov.sg: https://data.gov.sg/datasets/d_6cdb6b405b25aaaacbaf7689bcc6fae0/view — Singapore Open Data Licence.
- Transport for London: https://tfl.gov.uk/info-for/open-data-users/our-open-data — camera images retain provider branding and are displayed uncropped. Video is labeled as recent clips, not continuous live video.
- Windy.com: https://api.windy.com/webcams — optional API-key integration, provider-hosted players with attribution. No key is stored persistently.
- Fintraffic / Digitraffic: https://www.digitraffic.fi/en/road-traffic/ — public Finnish road-weather camera snapshots; roughly ten-minute image updates.
