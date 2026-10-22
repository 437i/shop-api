/**
 * Обёртка живого прогона: генерирует префикс прогона, передаёт его сценариям
 * через `E2E_LIVE_RUNID` и запускает Playwright с отдельным конфигом.
 *
 * Запуск: `npm run test:e2e:live` (из `frontend/`).
 */
import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { createRunPrefix } from "../src/test-support/live/run-data.ts"

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const prefix = createRunPrefix()

console.log(`префикс прогона: ${prefix}`)

const result = spawnSync(
  resolve(frontendRoot, "node_modules/.bin/playwright"),
  ["test", "--config", "playwright.live.config.ts"],
  {
    cwd: frontendRoot,
    env: { ...process.env, E2E_LIVE_RUNID: prefix },
    stdio: "inherit",
  },
)

process.exit(result.status ?? 1)
