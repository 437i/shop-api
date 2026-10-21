import { describe, expect, it } from "vitest"

import {
  MissingTokenError,
  resolveAuthMutationError,
} from "@/pages/auth/useAuthMutations"
import { ApiError, NetworkError } from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

const translate = (key: string) => i18n.t(key)

describe("resolveAuthMutationError", () => {
  it("returns the server message for a 400 response", () => {
    const error = new ApiError(400, "invalid data")

    expect(
      resolveAuthMutationError(error, "register", translate),
    ).toBe("invalid data")
  })

  it("falls back to the flow specific text when a 400 response has no message", () => {
    const error = new ApiError(400)

    expect(resolveAuthMutationError(error, "register", translate)).toBe(
      i18n.t("errors.invalidRequest"),
    )
    expect(resolveAuthMutationError(error, "reset", translate)).toBe(
      i18n.t("errors.invalidRequest"),
    )
    expect(resolveAuthMutationError(error, "changePassword", translate)).toBe(
      i18n.t("errors.invalidCurrentPassword"),
    )
  })

  it("returns the server message for a 409 response", () => {
    const error = new ApiError(409, "user already exists")

    expect(resolveAuthMutationError(error, "register", translate)).toBe(
      "user already exists",
    )
  })

  it("falls back to the conflict text when a 409 response has no message", () => {
    const error = new ApiError(409)

    expect(resolveAuthMutationError(error, "register", translate)).toBe(
      i18n.t("errors.userAlreadyExists"),
    )
  })

  it("returns the server message for a 502 response", () => {
    const error = new ApiError(502, "auth service error")

    expect(resolveAuthMutationError(error, "reset", translate)).toBe(
      "auth service error",
    )
  })

  it("falls back to the service unavailable text when a 502 response has no message", () => {
    const error = new ApiError(502)

    expect(resolveAuthMutationError(error, "reset", translate)).toBe(
      i18n.t("errors.authenticationUnavailable"),
    )
  })

  it("reports a network failure without a response", () => {
    const error = new NetworkError(new TypeError("Failed to fetch"))

    expect(resolveAuthMutationError(error, "register", translate)).toBe(
      "Network error. Please try again.",
    )
  })

  it("reports a missing token in the response", () => {
    const error = new MissingTokenError()

    expect(resolveAuthMutationError(error, "register", translate)).toBe(
      "Authentication failed: no token received",
    )
  })

  it("returns nothing for a 401 response so the session handler takes over", () => {
    const error = new ApiError(401, "invalid or expired token")

    expect(resolveAuthMutationError(error, "changePassword", translate)).toBeNull()
  })

  it("falls back to the server error for an unknown failure", () => {
    expect(
      resolveAuthMutationError(new Error("boom"), "register", translate),
    ).toBe(i18n.t("errors.server"))
  })
})
