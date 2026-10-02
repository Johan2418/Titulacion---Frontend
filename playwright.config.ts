import { defineConfig, devices } from '@playwright/test'

const PUERTO = 4173

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: 'retain-on-failure',
    locale: 'es-EC',
    timezoneId: 'America/Guayaquil',
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : undefined,
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] }, grepInvert: /@solo-movil/ },
    { name: 'movil', use: { ...devices['Pixel 7'] }, grep: /@movil|@solo-movil/ },
  ],
  webServer: {
    command: `npx vite --port ${PUERTO} --strictPort`,
    port: PUERTO,
    reuseExistingServer: !process.env.CI,
  },
})
