/**
 * CLI-обёртка проверки готовности локального стенда.
 *
 * Запуск: `npm run live:preflight` (из `frontend/`).
 * Код 0 — стенд готов, ненулевой — стенд не готов или проверка не выполнена.
 */
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
  DEFAULT_API_BASE_URL,
  checkLiveStack,
  formatReadinessReport,
} from "../src/test-support/live/stack-readiness.ts"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, "../..")

const apiBaseUrl = process.env.E2E_LIVE_API_URL ?? DEFAULT_API_BASE_URL

const report = await checkLiveStack({ apiBaseUrl, cwd: repoRoot })

console.log(formatReadinessReport(report))
console.log(`адрес Go API: ${apiBaseUrl}`)

if (!report.ready) {
  console.error(
    report.status === "api-address-invalid"
      ? "живой прогон остановлен: адрес Go API не является локальным — прогон выполняется только против локального стенда (подробности в отчёте выше)"
      : "стенд не готов: поднимите локальный Compose-стенд командой `docker compose up -d` в корне репозитория и повторите проверку",
  )
  process.exit(1)
}
