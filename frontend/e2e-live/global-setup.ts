/**
 * Глобальная подготовка живого прогона: проверка готовности стенда.
 * Пока стенд не готов, сценарии не запускаются и тестовые данные не создаются.
 */
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
  checkLiveStack,
  formatReadinessReport,
} from "../src/test-support/live/stack-readiness.ts"
import { readRunPrefix } from "../src/test-support/live/run-data.ts"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")

export default async function globalSetup(): Promise<void> {
  const prefix = readRunPrefix(process.env)
  const report = await checkLiveStack({ cwd: repoRoot, prefix })

  console.log(formatReadinessReport(report))

  if (!report.ready) {
    throw new Error(
      "живой прогон остановлен: локальный Compose-стенд не готов (см. отчёт выше)",
    )
  }
}
