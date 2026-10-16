import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ApiError,
  NetworkError,
  apiClient,
  getAuthToken,
  setAuthToken,
} from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"

import { type LoginFormValues, loginSchema } from "./loginSchema"

type LoginRequest = components["schemas"]["internal_auth.LoginRequest"]
type LoginResponse = components["schemas"]["internal_auth.Response"]

type TranslateFn = (key: string) => string

class MissingTokenError extends Error {
  constructor() {
    super("Authentication failed: no token received")
    this.name = "MissingTokenError"
  }
}

function resolveLoginError(error: unknown, translate: TranslateFn): string {
  if (error instanceof MissingTokenError) {
    return translate("errors.missingToken")
  }

  if (error instanceof NetworkError) {
    return translate("errors.network")
  }

  if (error instanceof ApiError) {
    if (error.status === 400) {
      return error.responseMessage ?? translate("errors.invalidCredentials")
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

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const response = await apiClient.post<LoginRequest, LoginResponse>(
        "/auth",
        values,
      )

      if (!response.token) {
        throw new MissingTokenError()
      }

      return response.token
    },
    onSuccess: (token) => {
      setAuthToken(token)
      navigate("/clients", { replace: true })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  if (getAuthToken()) {
    return <Navigate to="/clients" replace />
  }

  const errorMessage = loginMutation.error
    ? resolveLoginError(loginMutation.error, t)
    : null

  const onSubmit = handleSubmit((values) => {
    if (loginMutation.isPending) {
      return
    }

    loginMutation.mutate(values)
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t("login.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="email">{t("login.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t("login.emailPlaceholder")}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              {errors.email?.message ? (
                <p
                  id="email-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {t(errors.email.message)}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t("login.passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder={t("login.passwordPlaceholder")}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? "password-error" : undefined}
                {...register("password")}
              />
              {errors.password?.message ? (
                <p
                  id="password-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {t(errors.password.message)}
                </p>
              ) : null}
            </div>
            {errorMessage ? (
              <p role="alert" className="text-xs text-destructive">
                {errorMessage}
              </p>
            ) : null}
            <Button type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending
                ? t("login.submitting")
                : t("login.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
