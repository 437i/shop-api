/**
 * Общие хелперы живого прогона: работа с настоящим Go API и подготовка
 * тестовых данных. Мок API из `e2e/helpers.ts` здесь не используется —
 * прогоны идут против живого стенда.
 */
import { execFileSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import type { APIRequestContext } from "@playwright/test"

import {
  CLEANUP_ORDER,
  createRunData,
  readRunPrefix,
  type RunData,
} from "../src/test-support/live/run-data.ts"
import { findResetPassword } from "../src/test-support/live/auth-log.ts"

export type ApiEntity = {
  id: string
  name?: string
  surname?: string
}

export const API = {
  register: "/api/v1/register",
  login: "/api/v1/auth",
  reset: "/api/v1/reset",
  products: "/api/v1/products",
  clients: "/api/v1/clients",
  suppliers: "/api/v1/suppliers",
}

/** Категория из сид-данных стенда: создаётся один раз и переиспользуется прогонами. */
export const CATEGORY_NAME = "Refrigerators"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")

/** Тестовые данные текущего прогона. */
export function liveRunData(): RunData {
  return createRunData(readRunPrefix(process.env))
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

/** Регистрация тестового пользователя через настоящий Java-сервис. */
export async function apiRegister(
  request: APIRequestContext,
  data: RunData,
  email: string,
): Promise<void> {
  const response = await request.post(API.register, {
    data: {
      name: data.name,
      surname: data.surname,
      email,
      phone: data.phone,
      password: data.password,
    },
  })

  if (!response.ok()) {
    throw new Error(
      `регистрация ${email} не удалась: ${response.status()} ${await response.text()}`,
    )
  }
}

/** Вход и получение JWT. */
export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const response = await request.post(API.login, {
    data: { email, password },
  })

  if (!response.ok()) {
    throw new Error(
      `вход ${email} не удался: ${response.status()} ${await response.text()}`,
    )
  }

  const body = (await response.json()) as { token?: string }
  if (!body.token) {
    throw new Error(`вход ${email} не вернул токен`)
  }
  return body.token
}

/**
 * Возвращает токен пользователя, регистрируя его при первом обращении.
 * Так сценарии не зависят от порядка запуска.
 */
export async function ensureUser(
  request: APIRequestContext,
  data: RunData,
  email: string,
): Promise<string> {
  try {
    return await apiLogin(request, email, data.password)
  } catch {
    await apiRegister(request, data, email)
    return apiLogin(request, email, data.password)
  }
}

/** Создание сущности через Go API. */
export async function apiCreate(
  request: APIRequestContext,
  token: string,
  path: string,
  body: unknown,
): Promise<ApiEntity> {
  const response = await request.post(path, {
    headers: authHeaders(token),
    data: body,
  })

  if (!response.ok()) {
    throw new Error(
      `создание ${path} не удалось: ${response.status()} ${await response.text()}`,
    )
  }

  return (await response.json()) as ApiEntity
}

/** Список сущностей через Go API. */
export async function apiList(
  request: APIRequestContext,
  token: string,
  path: string,
): Promise<ApiEntity[]> {
  const response = await request.get(path, { headers: authHeaders(token) })

  if (!response.ok()) {
    throw new Error(
      `чтение ${path} не удалось: ${response.status()} ${await response.text()}`,
    )
  }

  return (await response.json()) as ApiEntity[]
}

/** Удаление сущности через Go API. */
export async function apiDelete(
  request: APIRequestContext,
  token: string,
  path: string,
  id: string,
): Promise<void> {
  const response = await request.delete(`${path}/${id}`, {
    headers: authHeaders(token),
  })

  if (!response.ok() && response.status() !== 404) {
    throw new Error(
      `удаление ${path}/${id} не удалось: ${response.status()} ${await response.text()}`,
    )
  }
}

/**
 * Удаляет сущности текущего прогона через Go API в порядке
 * товар → клиент → поставщик: пока на поставщика ссылается товар, его удаление
 * отклоняется. Возвращает список удалённых идентификаторов.
 */
export async function cleanupEntities(
  request: APIRequestContext,
  token: string,
  data: RunData,
): Promise<string[]> {
  const removed: string[] = []
  const named = {
    products: data.productName,
    clients: data.clientName,
    suppliers: data.supplierName,
  }

  for (const target of CLEANUP_ORDER) {
    const entities = await apiList(request, token, API[target])
    for (const entity of entities) {
      if (entity.name !== named[target]) continue
      await apiDelete(request, token, API[target], entity.id)
      removed.push(`${target}:${entity.id}`)
    }
  }

  return removed
}

/**
 * Полный вывод лога сервиса `auth`: почты в стенде нет, поэтому новый пароль
 * публикуется в логах. Лог не печатается в пользовательский вывод — его длина
 * используется как смещение, с которого ищется запись текущего сброса.
 */
export function readAuthLog(): string {
  return execFileSync("docker", ["compose", "logs", "auth"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
}

/**
 * Новый пароль из логов сервиса `auth`. Ищется только запись сброса, появившаяся
 * после `offset` — то есть после момента, зафиксированного непосредственно перед
 * POST-запросом сброса; записи прошлых прогонов игнорируются.
 */
export function readResetPassword(email: string, offset = 0): string | null {
  return findResetPassword(readAuthLog(), email, offset)
}
