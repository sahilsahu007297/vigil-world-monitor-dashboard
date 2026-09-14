import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: { baseURL: 'http://localhost:8443', headless: true, channel: 'msedge', viewport: { width: 1440, height: 1000 } },
});
