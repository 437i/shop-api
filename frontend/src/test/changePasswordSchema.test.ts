import { describe, expect, it } from "vitest"

import { changePasswordSchema } from "@/pages/auth/changePasswordSchema"

function firstIssue(values: { currentPassword: string; newPassword: string }) {
  const result = changePasswordSchema.safeParse(values)

  return result.success ? undefined : result.error.issues[0]?.message
}

describe("changePasswordSchema", () => {
  it("requires the current password", () => {
    expect(
      firstIssue({ currentPassword: "", newPassword: "secret1" }),
    ).toBe("auth.validation.currentPasswordRequired")
  })

  it("requires the new password", () => {
    expect(
      firstIssue({ currentPassword: "old-secret", newPassword: "" }),
    ).toBe("auth.validation.newPasswordRequired")
  })

  it("requires a new password longer than 5 characters", () => {
    expect(
      firstIssue({ currentPassword: "old-secret", newPassword: "12345" }),
    ).toBe("auth.validation.passwordShort")
    expect(
      firstIssue({ currentPassword: "old-secret", newPassword: "123456" }),
    ).toBeUndefined()
  })

  it("keeps the new password at most 72 bytes long", () => {
    expect(
      firstIssue({
        currentPassword: "old-secret",
        newPassword: "a".repeat(72),
      }),
    ).toBeUndefined()
    expect(
      firstIssue({
        currentPassword: "old-secret",
        newPassword: "a".repeat(73),
      }),
    ).toBe("auth.validation.passwordTooLong")
  })

  it("measures the new password length in bytes, not in characters", () => {
    const multibyte = "я".repeat(36)

    expect(
      firstIssue({ currentPassword: "old-secret", newPassword: multibyte }),
    ).toBeUndefined()
    expect(
      firstIssue({
        currentPassword: "old-secret",
        newPassword: `${multibyte}я`,
      }),
    ).toBe("auth.validation.passwordTooLong")
  })
})
