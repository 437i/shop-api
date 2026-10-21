import { describe, expect, it } from "vitest"

import { registerSchema } from "@/pages/auth/registerSchema"

const VALID = {
  name: "Иван",
  surname: "Иванов",
  email: "ivan@example.ru",
  phone: "+7-999-123-45-67",
  password: "secret1",
}

function firstIssue(values: Partial<typeof VALID>) {
  const result = registerSchema.safeParse({ ...VALID, ...values })

  return result.success ? undefined : result.error.issues[0]?.message
}

describe("registerSchema", () => {
  it("accepts values that satisfy the auth service rules", () => {
    const result = registerSchema.safeParse(VALID)

    expect(result.success).toBe(true)
  })

  it("requires every field", () => {
    expect(firstIssue({ name: "" })).toBe("auth.validation.nameRequired")
    expect(firstIssue({ surname: "" })).toBe("auth.validation.surnameRequired")
    expect(firstIssue({ email: "" })).toBe("auth.validation.emailRequired")
    expect(firstIssue({ phone: "" })).toBe("auth.validation.phoneRequired")
    expect(firstIssue({ password: "" })).toBe("auth.validation.passwordRequired")
  })

  it("accepts only letters in the name and the surname", () => {
    expect(firstIssue({ name: "Иван2" })).toBe("auth.validation.nameInvalid")
    expect(firstIssue({ surname: "Иванов_2" })).toBe(
      "auth.validation.surnameInvalid",
    )
  })

  it("keeps the name and the surname shorter than 30 characters", () => {
    expect(firstIssue({ name: "a".repeat(29) })).toBeUndefined()
    expect(firstIssue({ name: "a".repeat(30) })).toBe(
      "auth.validation.nameTooLong",
    )
    expect(firstIssue({ surname: "a".repeat(30) })).toBe(
      "auth.validation.surnameTooLong",
    )
  })

  it("accepts only .ru and .com email domains", () => {
    expect(firstIssue({ email: "ivan@example.ru" })).toBeUndefined()
    expect(firstIssue({ email: "ivan@example.com" })).toBeUndefined()
    expect(firstIssue({ email: "ivan@example.io" })).toBe(
      "auth.validation.emailInvalid",
    )
    expect(firstIssue({ email: "ivan@example" })).toBe(
      "auth.validation.emailInvalid",
    )
  })

  it("keeps the email shorter than 50 characters", () => {
    const domain = "@example.ru"
    const local = "a".repeat(49 - domain.length)

    expect(firstIssue({ email: `${local}${domain}` })).toBeUndefined()
    expect(firstIssue({ email: `${local}a${domain}` })).toBe(
      "auth.validation.emailTooLong",
    )
  })

  it("accepts the phone formats of the auth service", () => {
    expect(firstIssue({ phone: "+7-999-123-45-67" })).toBeUndefined()
    expect(firstIssue({ phone: "+79991234567" })).toBeUndefined()
    expect(firstIssue({ phone: "8-999-123-45-67" })).toBeUndefined()
    expect(firstIssue({ phone: "+7 999 123 45 67" })).toBe(
      "auth.validation.phoneInvalid",
    )
    expect(firstIssue({ phone: "+1-202-555-0123" })).toBe(
      "auth.validation.phoneInvalid",
    )
  })

  it("requires a password longer than 5 characters", () => {
    expect(firstIssue({ password: "12345" })).toBe(
      "auth.validation.passwordShort",
    )
    expect(firstIssue({ password: "123456" })).toBeUndefined()
  })

  it("keeps the password at most 72 bytes long", () => {
    expect(firstIssue({ password: "a".repeat(72) })).toBeUndefined()
    expect(firstIssue({ password: "a".repeat(73) })).toBe(
      "auth.validation.passwordTooLong",
    )
  })

  it("measures the password length in bytes, not in characters", () => {
    const multibyte = "я".repeat(36)

    expect(firstIssue({ password: multibyte })).toBeUndefined()
    expect(firstIssue({ password: `${multibyte}я` })).toBe(
      "auth.validation.passwordTooLong",
    )
  })
})
