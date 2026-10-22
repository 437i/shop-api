/**
 * Глобальная очистка живого прогона.
 *
 * Выполняется всегда — и после упавшего сценария:
 * 1) сущности текущего прогона удаляются через Go API в порядке
 *    товар → клиент → поставщик;
 * 2) тестовые пользователи удаляются из локальной auth-postgres выборкой
 *    по префиксу прогона.
 *
 * Постоянные тома и данные других прогонов не затрагиваются.
 */
import { execFileSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { request as playwrightRequest } from "@playwright/test"

import {
  buildDeleteUserQuery,
  buildPsqlArgs,
  createRunData,
  readRunPrefix,
} from "../src/test-support/live/run-data.ts"
import { apiLogin, cleanupEntities } from "./helpers"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const baseURL = "http://127.0.0.1:5173"

export default async function globalTeardown(): Promise<void> {
  const prefix = readRunPrefix(process.env)
  const data = createRunData(prefix)
  const request = await playwrightRequest.newContext({ baseURL })

  try {
    let token: string | null = null
    for (const email of [data.email, data.uiEmail]) {
      try {
        token = await apiLogin(request, email, data.password)
        break
      } catch {
        // учётной записи с этим email нет — пробуем следующий вариант
      }
    }

    if (token) {
      const removed = await cleanupEntities(request, token, data)
      console.log(`очистка через Go API: удалено записей — ${removed.length}`)
    } else {
      console.warn(
        "очистка через Go API пропущена: нет действующей учётной записи текущего прогона",
      )
    }
  } catch (error) {
    console.error("очистка через Go API не завершена:", error)
  } finally {
    await request.dispose()
  }

  try {
    execFileSync("docker", buildPsqlArgs(buildDeleteUserQuery(prefix)), {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    console.log(`очистка auth-postgres: удалены пользователи с префиксом ${prefix}`)
  } catch (error) {
    console.error(
      `очистка auth-postgres не завершена (префикс ${prefix}):`,
      error,
    )
  }
}
