import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api.airplanes.live/**', route => route.fulfill({ status: 403, json: { error: 'Project approval required' } }));
  await page.route('**/public-feeds/aircraft/**', route => route.fulfill({ json: { now: Date.now(), ac: route.request().url().includes('NONE') ? [] : [{ hex: '800001', flight: 'AIC101', r: 'VT-TEST', t: 'A320', lat: 28.6, lon: 77.2, alt_baro: 10000, gs: 0, track: 0, baro_rate: 0, squawk: '0000', seen_pos: 1 }] } }));
  await page.route('**/api.data.gov.sg/**', route => route.fulfill({ json: { items: [{ cameras: [{ camera_id: '1', timestamp: new Date().toISOString(), image: 'https://example.com/camera.svg', location: { latitude: 1.3, longitude: 103.8 } }] }] } }));
  await page.route('**/api.tfl.gov.uk/**', route => route.fulfill({ json: [] }));
  await page.route('**/tie.digitraffic.fi/**', route => route.fulfill({ json: { features: [] } }));
  await page.route('https://example.com/camera.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="teal"/></svg>' }));
  await page.goto('/');
  const launch = page.getByRole('button', { name: 'Launch Dashboard', exact: true });
  if (await launch.isVisible()) await launch.click();
});

test('fallback search and dossier preserve zero telemetry and map location', async ({ page }) => {
  await page.getByRole('button', { name: 'SEARCH FLIGHTS', exact: true }).click();
  await page.getByLabel('Flight identifier', { exact: true }).fill('AIC101');
  await page.getByRole('button', { name: 'Search flights', exact: true }).last().click();
  await page.getByRole('button', { name: /AIC101.*Open dossier/ }).click();
  const dossier = page.getByRole('dialog', { name: 'Aircraft dossier' });
  await expect(dossier).toContainText('ADSB.lol');
  await expect(dossier).toContainText('10000 ft');
  await expect(dossier).toContainText('0 kt');
  await expect(dossier).toContainText('0\u00b0');
  await expect(dossier).toContainText('Not reported');
  await dossier.getByRole('button', { name: 'Locate reported position' }).click();
  await expect(page.locator('.flight-overlay')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/aircraft-dossier.png' });
});

test('empty results do not fabricate aircraft', async ({ page }) => {
  await page.getByRole('button', { name: 'SEARCH FLIGHTS', exact: true }).click();
  await page.getByLabel('Flight identifier', { exact: true }).fill('NONE');
  await page.getByRole('button', { name: 'Search flights', exact: true }).last().click();
  await expect(page.getByText(/No aircraft currently reported/)).toBeVisible();
  await expect(page.locator('.feed-result')).toHaveCount(0);
});

test('public camera search renders a snapshot in the dashboard', async ({ page }) => {
  await page.getByRole('button', { name: 'EXPLORE PUBLIC CAMERAS' }).click();
  await page.getByLabel('Search cameras').fill('Singapore');
  await page.getByRole('button', { name: /Singapore traffic 1/ }).click();
  const viewer = page.getByRole('dialog', { name: 'Public camera viewer' });
  await expect(viewer.getByText('Media loaded')).toBeVisible();
  await expect(viewer).toContainText('SNAPSHOT');
  await expect(viewer).toContainText('Captured:');
  await page.screenshot({ path: 'test-results/camera-viewer.png' });
  await viewer.getByRole('button', { name: 'Locate on map' }).click();
  await expect(viewer).toHaveCount(0);
});

