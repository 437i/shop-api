import { defineConfig } from "@playwright/test"

/**
 * Конфигурация живого e2e-прогона против локального Compose-стенда.
 *
 * Отдельный конфиг и отдельная директория: дефолтный `playwright.config.ts`
 * собирает только `e2e/`, поэтому живые спеки не попадают в `npm run test:e2e`.
 * Запуск — только отдельной командой `npm run test:e2e:live`.
 */
export default defineConfig({
  testDir: "./e2e-live",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  globalSetup: "./e2e-live/global-setup.ts",
  globalTeardown: "./e2e-live/global-teardown.ts",
})
