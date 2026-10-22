import { describe, expect, it } from "vitest"

import { findResetPassword } from "./auth-log"

const EMAIL = "e2e-live-20261022t160000z-a1b2c3-rst@example.com"
const PASSWORD = "aiZHMjkVPY2h"

/** Посторонние записи лога: стенд пишет их постоянно. */
function noise(lines: number): string {
  return Array.from(
    { length: lines },
    (_, index) =>
      `be3-auth  | 2026-10-22T16:00:00.000Z  INFO 1 --- [auth-service] auth.security.PasswordResetService : PASSWORD RESET ATTEMPT ${index}`,
  ).join("\n")
}

function resetRecord(email = EMAIL, password = PASSWORD): string {
  return [
    `be3-auth  | 2026-10-22T16:05:00.000Z  INFO 1 --- [auth-service] auth.security.PasswordResetService       : PASSWORD RESET SUCCESS for user: ${email}`,
    `be3-auth  | 2026-10-22T16:05:00.001Z  INFO 1 --- [auth-service] auth.security.PasswordResetService       : New password: ${password}`,
  ].join("\n")
}

describe("findResetPassword", () => {
  it("находит пароль, даже если до записи сброса более 400 строк лога", () => {
    const log = `${noise(520)}\n${resetRecord()}\n`

    expect(findResetPassword(log, EMAIL)).toBe(PASSWORD)
  })

  it("берёт последнюю запись сброса, если их несколько", () => {
    const log = [
      resetRecord(EMAIL, "FirstPassword1"),
      noise(3),
      resetRecord(EMAIL, "SecondPassword2"),
    ].join("\n")

    expect(findResetPassword(log, EMAIL)).toBe("SecondPassword2")
  })

  it("игнорирует записи, расположенные до заданного смещения", () => {
    const log = `${resetRecord()}\n${noise(5)}\n`
    const offset = log.length

    expect(findResetPassword(log, EMAIL, offset)).toBeNull()
  })

  it("находит запись, если смещение указывает на начало новой части лога", () => {
    const before = `${noise(700)}\n`
    const after = `${resetRecord()}\n`

    expect(findResetPassword(before + after, EMAIL, before.length)).toBe(PASSWORD)
  })

  it("учитывает, что Go API приводит email к нижнему регистру", () => {
    const log = `${resetRecord()}\n`

    expect(findResetPassword(log, "E2E-LIVE-20261022T160000Z-A1B2C3-RST@example.com")).toBe(
      PASSWORD,
    )
  })

  it("возвращает null, если записи о сбросе нет", () => {
    expect(findResetPassword(noise(10), EMAIL)).toBeNull()
  })

  it("возвращает null, если после записи о сбросе нет пароля", () => {
    const log = `be3-auth  | PASSWORD RESET SUCCESS for user: ${EMAIL}\n`

    expect(findResetPassword(log, EMAIL)).toBeNull()
  })
})
