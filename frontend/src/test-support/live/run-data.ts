/**
 * Тестовые данные живого прогона: префикс прогона, именование сущностей,
 * порядок и команды очистки.
 *
 * Модуль не обращается к Docker и сети — вся логика проверяется unit-тестами.
 */
import { escapeSqlLiteral, psqlShellCommand } from "./stack-readiness.ts"

/** Формат префикса прогона: `e2e-live-<YYYYMMDDTHHMMSSZ>-<6 символов [a-z0-9]>`. */
export const RUN_PREFIX_PATTERN = /^e2e-live-\d{8}T\d{6}Z-[a-z0-9]{6}$/

/** Ограничения клиентской схемы регистрации и Java-сервиса. */
export const MAX_EMAIL_LENGTH = 49
export const MAX_NAME_LENGTH = 29

/** Данные тестового пользователя: имя и фамилия — только буквы, без пробелов. */
export const USER_NAME = "Live"
export const USER_SURNAME = "Probe"
export const USER_PHONE = "+7-900-000-00-01"
export const USER_PASSWORD = "LiveProbe2026"

/**
 * Варианты тестового пользователя. Различаются локальной частью email, поэтому
 * каждый начинается с префикса прогона и удаляется одной выборкой.
 */
export type UserVariant = "primary" | "ui" | "reset"

/** Порядок удаления сущностей: товар → клиент → поставщик. */
export const CLEANUP_ORDER = ["products", "clients", "suppliers"] as const

export type CleanupTarget = (typeof CLEANUP_ORDER)[number]

export type RunData = {
  prefix: string
  email: string
  uiEmail: string
  resetEmail: string
  name: string
  surname: string
  phone: string
  password: string
  supplierName: string
  productName: string
  clientName: string
  clientSurname: string
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0")
}

/** Метка времени UTC в формате `YYYYMMDDTHHMMSSZ` (16 символов). */
export function formatRunTimestamp(date: Date): string {
  const day = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
  const time = `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  return `${day}T${time}Z`
}

/** Шесть случайных символов из `[a-z0-9]`. */
export function formatRandomSuffix(random: () => number = Math.random): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
  let suffix = ""
  for (let index = 0; index < 6; index += 1) {
    suffix += alphabet[Math.floor(random() * alphabet.length)] ?? "0"
  }
  return suffix
}

/** Уникальный префикс прогона. */
export function createRunPrefix(
  date: Date = new Date(),
  random: () => number = Math.random,
): string {
  return `e2e-live-${formatRunTimestamp(date)}-${formatRandomSuffix(random)}`
}

/** Email тестового пользователя; все варианты начинаются с префикса прогона. */
export function buildUserEmail(
  prefix: string,
  variant: UserVariant = "primary",
): string {
  const suffix =
    variant === "primary" ? "" : variant === "ui" ? "-ui" : "-rst"
  return `${prefix}${suffix}@example.com`
}

/** Имя создаваемой сущности с префиксом прогона. */
export function buildEntityName(prefix: string, label: string): string {
  return `${prefix} ${label}`
}

/** SQL удаления тестовых пользователей текущего прогона. */
export function buildDeleteUserQuery(prefix: string): string {
  return `DELETE FROM users WHERE email ILIKE '${escapeSqlLiteral(prefix)}%';`
}

/** Аргументы `docker compose exec` для выполнения SQL в локальной auth-postgres. */
export function buildPsqlArgs(query: string): string[] {
  return [
    "compose",
    "exec",
    "-T",
    "auth-postgres",
    "sh",
    "-c",
    psqlShellCommand(query),
  ]
}

/** Полный набор тестовых данных прогона. */
export function createRunData(prefix: string): RunData {
  return {
    prefix,
    email: buildUserEmail(prefix, "primary"),
    uiEmail: buildUserEmail(prefix, "ui"),
    resetEmail: buildUserEmail(prefix, "reset"),
    name: USER_NAME,
    surname: USER_SURNAME,
    phone: USER_PHONE,
    password: USER_PASSWORD,
    supplierName: buildEntityName(prefix, "supplier"),
    productName: buildEntityName(prefix, "product"),
    clientName: buildEntityName(prefix, "client"),
    clientSurname: buildEntityName(prefix, "clientsurname"),
  }
}

/** Префикс прогона из переменной окружения; без неё прогоны не запускаются. */
export function readRunPrefix(env: Record<string, string | undefined>): string {
  const prefix = env.E2E_LIVE_RUNID
  if (!prefix) {
    throw new Error(
      "не задана переменная окружения E2E_LIVE_RUNID с префиксом прогона",
    )
  }
  if (!RUN_PREFIX_PATTERN.test(prefix)) {
    throw new Error(
      `префикс прогона "${prefix}" не соответствует формату ${RUN_PREFIX_PATTERN.source}`,
    )
  }
  return prefix
}
