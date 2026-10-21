import { useMutation } from "@tanstack/react-query"

import type { ChangePasswordFormValues } from "@/pages/auth/changePasswordSchema"
import type { RegisterFormValues } from "@/pages/auth/registerSchema"
import type { ResetPasswordFormValues } from "@/pages/auth/resetPasswordSchema"
import { ApiError, NetworkError, apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"

type RegisterRequest = components["schemas"]["internal_auth.RegisterRequest"]
type ResetRequest = components["schemas"]["internal_auth.ResetRequest"]
type ChangeRequest = components["schemas"]["internal_auth.ChangeRequest"]
type AuthResponse = components["schemas"]["internal_auth.Response"]

export type AuthFlow = "register" | "reset" | "changePassword"

type TranslateFn = (key: string) => string

const INVALID_DATA_FALLBACK: Record<AuthFlow, string> = {
  register: "errors.invalidRequest",
  reset: "errors.invalidRequest",
  changePassword: "errors.invalidCurrentPassword",
}

export class MissingTokenError extends Error {
  constructor() {
    super("Authentication failed: no token received")
    this.name = "MissingTokenError"
  }
}

export function resolveAuthMutationError(
  error: unknown,
  flow: AuthFlow,
  translate: TranslateFn,
): string | null {
  if (error instanceof MissingTokenError) {
    return translate("errors.missingToken")
  }

  if (error instanceof NetworkError) {
    return translate("errors.network")
  }

  if (error instanceof ApiError) {
    if (error.status === 401) {
      return null
    }

    if (error.status === 400) {
      return error.responseMessage ?? translate(INVALID_DATA_FALLBACK[flow])
    }

    if (error.status === 409) {
      return error.responseMessage ?? translate("errors.userAlreadyExists")
    }

    if (error.status === 502) {
      return (
        error.responseMessage ?? translate("errors.authenticationUnavailable")
      )
    }

    return error.responseMessage ?? translate("errors.server")
  }

  return translate("errors.server")
}

export function useRegister() {
  return useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      const response = await apiClient.post<RegisterRequest, AuthResponse>(
        "/register",
        {
          name: values.name,
          surname: values.surname,
          email: values.email,
          phone: values.phone,
          password: values.password,
        },
      )

      if (!response.token) {
        throw new MissingTokenError()
      }

      return response.token
    },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      apiClient.post<ResetRequest, void>("/reset", { email: values.email }),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (values: ChangePasswordFormValues) =>
      apiClient.post<ChangeRequest, void>("/change", {
        current_password: values.currentPassword,
        new_password: values.newPassword,
      }),
  })
}
