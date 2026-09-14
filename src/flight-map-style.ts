// Adapted from xSNOWM4Nx/react-flight-tracker, MIT © 2020 Daniel Neuweiler.
// See THIRD_PARTY_NOTICES.md. Uses its flight SVG and altitude colour scale.
export const FLIGHT_PATH = 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';
export function aircraftColor(altitude: number) {
  const percent = Math.max(0, Math.min(100, (Number.isFinite(altitude) ? altitude : 0) / 13000 * 100));
  const r = percent < 50 ? 255 : Math.round(510 - 5.1 * percent);
  const g = percent < 50 ? Math.round(5.1 * percent) : 255;
  return '#' + ((r << 16) + (g << 8)).toString(16).padStart(6, '0');
}
