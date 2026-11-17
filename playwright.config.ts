import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests', testMatch: '*.browser.ts',
  use: {
    baseURL: process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/economics/',
    channel: process.env.BROWSER_CHANNEL,
  },
  webServer: process.env.PREVIEW_URL ? undefined : {
    command: 'SITE_BASE=/economics/ npm run build && SITE_BASE=/economics/ npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/economics/',
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 960 } } },
    { name: 'phone', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 800 } } },
  ],
})
