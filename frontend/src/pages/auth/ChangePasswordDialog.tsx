import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  type ChangePasswordFormValues,
  changePasswordSchema,
} from "@/pages/auth/changePasswordSchema"
import {
  resolveAuthMutationError,
  useChangePassword,
} from "@/pages/auth/useAuthMutations"
import { notifySuccess } from "@/shared/feedback/notifications"

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

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

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const { t } = useTranslation()
  const changePassword = useChangePassword()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  })

  const errorMessage = changePassword.error
    ? resolveAuthMutationError(changePassword.error, "changePassword", t)
    : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (changePassword.isPending) {
      return
    }

    if (!nextOpen) {
      changePassword.reset()
      reset()
    }

    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit((values) => {
    if (changePassword.isPending) {
      return
    }

    changePassword.mutate(values, {
      onSuccess: () => {
        notifySuccess("auth.changePassword.success")
        reset()
        onOpenChange(false)
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("auth.changePassword.title")}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="change-password-current">
              {t("auth.changePassword.currentPasswordLabel")}
            </Label>
            <Input
              id="change-password-current"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.currentPassword ? true : undefined}
              aria-describedby={
                errors.currentPassword ? "change-password-current-error" : undefined
              }
              {...register("currentPassword")}
            />
            <FieldError
              id="change-password-current-error"
              message={errors.currentPassword?.message}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="change-password-new">
              {t("auth.changePassword.newPasswordLabel")}
            </Label>
            <Input
              id="change-password-new"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.newPassword ? true : undefined}
              aria-describedby={
                errors.newPassword ? "change-password-new-error" : undefined
              }
              {...register("newPassword")}
            />
            <FieldError
              id="change-password-new-error"
              message={errors.newPassword?.message}
            />
          </div>
          {errorMessage ? (
            <p role="alert" className="text-xs text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={changePassword.isPending}
            >
              {t("auth.changePassword.cancel")}
            </Button>
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending
                ? t("auth.changePassword.submitting")
                : t("auth.changePassword.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
