import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useNavigate } from "react-router"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  type RegisterFormValues,
  registerSchema,
} from "@/pages/auth/registerSchema"
import {
  resolveAuthMutationError,
  useRegister,
} from "@/pages/auth/useAuthMutations"
import { getAuthToken, setAuthToken } from "@/shared/api/client"

function FieldError({ id, message }: { id: string; message?: string }) {
  const { t } = useTranslation()

  if (!message) {
    return null
  }

  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {t(message)}
    </p>
  )
}

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const registerMutation = useRegister()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  if (getAuthToken()) {
    return <Navigate to="/clients" replace />
  }

  const errorMessage = registerMutation.error
    ? resolveAuthMutationError(registerMutation.error, "register", t)
    : null

  const onSubmit = handleSubmit((values) => {
    if (registerMutation.isPending) {
      return
    }

    registerMutation.mutate(values, {
      onSuccess: (token) => {
        setAuthToken(token)
        navigate("/clients", { replace: true })
      },
    })
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            {t("auth.register.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="name">{t("auth.register.nameLabel")}</Label>
              <Input
                id="name"
                type="text"
                autoComplete="given-name"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...register("name")}
              />
              <FieldError id="name-error" message={errors.name?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="surname">
                {t("auth.register.surnameLabel")}
              </Label>
              <Input
                id="surname"
                type="text"
                autoComplete="family-name"
                aria-invalid={errors.surname ? true : undefined}
                aria-describedby={errors.surname ? "surname-error" : undefined}
                {...register("surname")}
              />
              <FieldError id="surname-error" message={errors.surname?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t("auth.register.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t("auth.register.emailPlaceholder")}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              <FieldError id="email-error" message={errors.email?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">{t("auth.register.phoneLabel")}</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder={t("auth.register.phonePlaceholder")}
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                {...register("phone")}
              />
              <FieldError id="phone-error" message={errors.phone?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">
                {t("auth.register.passwordLabel")}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder={t("auth.register.passwordPlaceholder")}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? "password-error" : undefined}
                {...register("password")}
              />
              <FieldError
                id="password-error"
                message={errors.password?.message}
              />
            </div>
            {errorMessage ? (
              <p role="alert" className="text-xs text-destructive">
                {errorMessage}
              </p>
            ) : null}
            <Button type="submit" disabled={registerMutation.isPending}>
              {registerMutation.isPending
                ? t("auth.register.submitting")
                : t("auth.register.submit")}
            </Button>
            <Link
              className={buttonVariants({ variant: "link", size: "xs" })}
              to="/auth/login"
            >
              {t("auth.links.toLogin")}
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
