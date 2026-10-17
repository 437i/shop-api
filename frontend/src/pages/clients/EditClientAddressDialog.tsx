import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
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
  type ClientAddressFormValues,
  clientAddressSchema,
} from "@/pages/clients/clientFormSchema"
import {
  resolveClientMutationError,
  useUpdateClientAddress,
} from "@/pages/clients/useClientMutations"
import type { components } from "@/shared/api/generated/schema"

type ClientResponse = components["schemas"]["internal_client.Response"]

interface EditClientAddressDialogProps {
  client: ClientResponse | null
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

export function EditClientAddressDialog({
  client,
  onOpenChange,
}: EditClientAddressDialogProps) {
  const { t } = useTranslation()
  const updateAddress = useUpdateClientAddress()
  const open = client !== null

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientAddressFormValues>({
    resolver: zodResolver(clientAddressSchema),
    defaultValues: { country: "", city: "", street: "" },
  })

  useEffect(() => {
    if (open && client) {
      reset({
        country: client.address?.country ?? "",
        city: client.address?.city ?? "",
        street: client.address?.street ?? "",
      })
    }
  }, [open, client, reset])

  const errorMessage = updateAddress.error
    ? resolveClientMutationError(updateAddress.error, t)
    : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (updateAddress.isPending) {
      return
    }

    if (!nextOpen) {
      updateAddress.reset()
    }

    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit((values) => {
    if (!client?.id || updateAddress.isPending) {
      return
    }

    updateAddress.mutate(
      { clientId: client.id, address: values },
      {
        onSuccess: () => {
          updateAddress.reset()
          onOpenChange(false)
        },
      },
    )
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("clients.editAddress.title")}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-address-country">
                {t("clients.editAddress.countryLabel")}
              </Label>
              <Input
                id="edit-address-country"
                autoComplete="off"
                aria-invalid={errors.country ? true : undefined}
                aria-describedby={
                  errors.country ? "edit-address-country-error" : undefined
                }
                {...register("country")}
              />
              <FieldError
                id="edit-address-country-error"
                message={errors.country?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address-city">
                {t("clients.editAddress.cityLabel")}
              </Label>
              <Input
                id="edit-address-city"
                autoComplete="off"
                aria-invalid={errors.city ? true : undefined}
                aria-describedby={
                  errors.city ? "edit-address-city-error" : undefined
                }
                {...register("city")}
              />
              <FieldError
                id="edit-address-city-error"
                message={errors.city?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address-street">
                {t("clients.editAddress.streetLabel")}
              </Label>
              <Input
                id="edit-address-street"
                autoComplete="off"
                aria-invalid={errors.street ? true : undefined}
                aria-describedby={
                  errors.street ? "edit-address-street-error" : undefined
                }
                {...register("street")}
              />
              <FieldError
                id="edit-address-street-error"
                message={errors.street?.message}
              />
            </div>
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
              disabled={updateAddress.isPending}
              onClick={() => handleOpenChange(false)}
            >
              {t("clients.editAddress.cancel")}
            </Button>
            <Button type="submit" disabled={updateAddress.isPending}>
              {updateAddress.isPending
                ? t("clients.editAddress.submitting")
                : t("clients.editAddress.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
