import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, Navigate } from "react-router"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  type ResetPasswordFormValues,
  resetPasswordSchema,
} from "@/pages/auth/resetPasswordSchema"
import {
  resolveAuthMutationError,
  useResetPassword,
} from "@/pages/auth/useAuthMutations"
import { getAuthToken } from "@/shared/api/client"

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const resetPassword = useResetPassword()
  const [isReset, setIsReset] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  if (getAuthToken()) {
    return <Navigate to="/clients" replace />
  }

  const errorMessage = resetPassword.error
    ? resolveAuthMutationError(resetPassword.error, "reset", t)
    : null

  const onSubmit = handleSubmit((values) => {
    if (resetPassword.isPending) {
      return
    }

    resetPassword.mutate(values, {
      onSuccess: () => setIsReset(true),
    })
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t("auth.reset.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isReset ? (
            <div className="grid gap-3">
              <p className="text-sm">{t("auth.reset.success")}</p>
              <p className="text-sm text-destructive">
                {t("auth.reset.successWarning")}
              </p>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={onSubmit} noValidate>
              <p className="text-sm text-muted-foreground">
                {t("auth.reset.description")}
              </p>
              <div className="grid gap-2">
                <Label htmlFor="email">{t("auth.reset.emailLabel")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("auth.reset.emailPlaceholder")}
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
              {errorMessage ? (
                <p role="alert" className="text-xs text-destructive">
                  {errorMessage}
                </p>
              ) : null}
              <Button type="submit" disabled={resetPassword.isPending}>
                {resetPassword.isPending
                  ? t("auth.reset.submitting")
                  : t("auth.reset.submit")}
              </Button>
              <Link
                className={buttonVariants({ variant: "link", size: "xs" })}
                to="/auth/login"
              >
                {t("auth.links.toLogin")}
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
