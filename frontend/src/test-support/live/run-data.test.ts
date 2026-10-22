import { describe, expect, it } from "vitest"

import { registerSchema } from "@/pages/auth/registerSchema"

import {
  CLEANUP_ORDER,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  RUN_PREFIX_PATTERN,
  buildDeleteUserQuery,
  buildEntityName,
  buildPsqlArgs,
  buildUserEmail,
  createRunData,
  createRunPrefix,
  formatRandomSuffix,
  formatRunTimestamp,
  readRunPrefix,
} from "./run-data"

/** Правила Java-сервиса (в клиентской схеме они те же, но приходят из другого сервиса). */
const JAVA_EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(ru|com)$/
const JAVA_NAME_PATTERN = /^[А-Яа-яЁёA-Za-z]+$/
const JAVA_PHONE_PATTERN = /^(\+7|8)-?\d{3}-?\d{3}-?\d{2}-\d{2}$/

const FIXED_DATE = new Date("2026-10-22T16:00:00Z")

function fixedRandom(): () => number {
  let call = 0
  return () => {
    call += 1
    return call / 100
  }
}

describe("префикс прогона", () => {
  it("имеет фиксированный формат и фиксированную длину", () => {
    const prefix = createRunPrefix(FIXED_DATE, fixedRandom())

    expect(prefix).toMatch(RUN_PREFIX_PATTERN)
    expect(prefix).toHaveLength(32)
    expect(prefix.startsWith("e2e-live-")).toBe(true)
  })

  it("использует метку времени UTC в формате YYYYMMDDTHHMMSSZ", () => {
    expect(formatRunTimestamp(FIXED_DATE)).toBe("20261022T160000Z")
    expect(formatRunTimestamp(FIXED_DATE)).toHaveLength(16)
  })

  it("берёт шесть случайных символов из [a-z0-9]", () => {
    const suffix = formatRandomSuffix(() => 0.5)

    expect(suffix).toHaveLength(6)
    expect(suffix).toMatch(/^[a-z0-9]{6}$/)
  })
})

describe("email тестового пользователя", () => {
  const prefix = createRunPrefix(FIXED_DATE, fixedRandom())

  it("основной вариант укладывается в ограничение длины и проходит правила обоих сервисов", () => {
    const email = buildUserEmail(prefix)

    expect(email).toBe(`${prefix}@example.com`)
    expect(email.length).toBeLessThanOrEqual(MAX_EMAIL_LENGTH)
    expect(JAVA_EMAIL_PATTERN.test(email)).toBe(true)
  })

  it("все варианты начинаются с префикса прогона и проходят правила обоих сервисов", () => {
    for (const variant of ["primary", "ui", "reset"] as const) {
      const email = buildUserEmail(prefix, variant)

      expect(email.startsWith(prefix)).toBe(true)
      expect(email.length).toBeLessThanOrEqual(MAX_EMAIL_LENGTH)
      expect(JAVA_EMAIL_PATTERN.test(email)).toBe(true)
    }
  })

  it("принимается клиентской схемой регистрации", () => {
    const runData = createRunData(prefix)

    for (const email of [runData.email, runData.uiEmail, runData.resetEmail]) {
      const result = registerSchema.safeParse({
        name: runData.name,
        surname: runData.surname,
        email,
        phone: runData.phone,
        password: runData.password,
      })

      expect(result.success).toBe(true)
    }
  })
})

describe("данные тестового пользователя", () => {
  const runData = createRunData(createRunPrefix(FIXED_DATE, fixedRandom()))

  it("имя и фамилия состоят только из букв и укладываются в ограничение длины", () => {
    expect(JAVA_NAME_PATTERN.test(runData.name)).toBe(true)
    expect(JAVA_NAME_PATTERN.test(runData.surname)).toBe(true)
    expect(runData.name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH)
    expect(runData.surname.length).toBeLessThanOrEqual(MAX_NAME_LENGTH)
  })

  it("телефон соответствует шаблону обоих сервисов", () => {
    expect(JAVA_PHONE_PATTERN.test(runData.phone)).toBe(true)
  })

  it("пароль длиннее 5 символов и не длиннее 72 байт", () => {
    expect(runData.password.length).toBeGreaterThan(5)
    expect(new TextEncoder().encode(runData.password).length).toBeLessThanOrEqual(72)
  })
})

describe("именование сущностей", () => {
  it("каждая сущность получает префикс прогона", () => {
    const prefix = createRunPrefix(FIXED_DATE, fixedRandom())
    const runData = createRunData(prefix)

    expect(runData.supplierName.startsWith(prefix)).toBe(true)
    expect(runData.productName.startsWith(prefix)).toBe(true)
    expect(runData.clientName.startsWith(prefix)).toBe(true)
    expect(buildEntityName(prefix, "supplier")).toBe(`${prefix} supplier`)
  })
})

describe("очистка", () => {
  it("удаляет сущности в порядке товар → клиент → поставщик", () => {
    expect(CLEANUP_ORDER).toEqual(["products", "clients", "suppliers"])
  })

  it("удаляет пользователей строго по префиксу текущего прогона", () => {
    const prefix = createRunPrefix(FIXED_DATE, fixedRandom())
    const query = buildDeleteUserQuery(prefix)

    expect(query).toBe(
      `DELETE FROM users WHERE email ILIKE '${prefix}%';`,
    )
    expect(query).not.toContain("e2e-live-%")
  })

  it("собирает команду psql без учётных данных в аргументах", () => {
    const args = buildPsqlArgs(buildDeleteUserQuery("e2e-live-"))

    expect(args.slice(0, 5)).toEqual([
      "compose",
      "exec",
      "-T",
      "auth-postgres",
      "sh",
    ])
    expect(args[6]).toContain('"$POSTGRES_USER"')
    expect(args[6]).toContain('"$POSTGRES_DB"')
    expect(args[6]).not.toMatch(/POSTGRES_PASSWORD/i)
  })
})

describe("чтение префикса из окружения", () => {
  it("возвращает префикс, соответствующий формату", () => {
    const prefix = createRunPrefix(FIXED_DATE, fixedRandom())

    expect(readRunPrefix({ E2E_LIVE_RUNID: prefix })).toBe(prefix)
  })

  it("требует переменную окружения", () => {
    expect(() => readRunPrefix({})).toThrow(/E2E_LIVE_RUNID/)
  })

  it("отклоняет префикс неверного формата", () => {
    expect(() => readRunPrefix({ E2E_LIVE_RUNID: "live-run" })).toThrow(
      /не соответствует формату/,
    )
  })
})
