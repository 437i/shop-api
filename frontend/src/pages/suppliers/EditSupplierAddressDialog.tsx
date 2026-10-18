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
  type SupplierAddressFormValues,
  supplierAddressSchema,
} from "@/pages/suppliers/supplierFormSchema"
import {
  resolveSupplierMutationError,
  useUpdateSupplierAddress,
} from "@/pages/suppliers/useSupplierMutations"
import type { components } from "@/shared/api/generated/schema"

type SupplierResponse = components["schemas"]["internal_supplier.Response"]

interface EditSupplierAddressDialogProps {
  supplier: SupplierResponse | null
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

export function EditSupplierAddressDialog({
  supplier,
  onOpenChange,
}: EditSupplierAddressDialogProps) {
  const { t } = useTranslation()
  const updateAddress = useUpdateSupplierAddress()
  const open = supplier !== null

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierAddressFormValues>({
    resolver: zodResolver(supplierAddressSchema),
    defaultValues: { country: "", city: "", street: "" },
  })

  useEffect(() => {
    if (open && supplier) {
      reset({
        country: supplier.address?.country ?? "",
        city: supplier.address?.city ?? "",
        street: supplier.address?.street ?? "",
      })
    }
  }, [open, supplier, reset])

  const errorMessage = updateAddress.error
    ? resolveSupplierMutationError(updateAddress.error, t)
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
    if (!supplier?.id || updateAddress.isPending) {
      return
    }

    updateAddress.mutate(
      { supplierId: supplier.id, address: values },
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
          <DialogTitle>{t("suppliers.editAddress.title")}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-supplier-address-country">
                {t("suppliers.editAddress.countryLabel")}
              </Label>
              <Input
                id="edit-supplier-address-country"
                autoComplete="off"
                aria-invalid={errors.country ? true : undefined}
                aria-describedby={
                  errors.country
                    ? "edit-supplier-address-country-error"
                    : undefined
                }
                {...register("country")}
              />
              <FieldError
                id="edit-supplier-address-country-error"
                message={errors.country?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-supplier-address-city">
                {t("suppliers.editAddress.cityLabel")}
              </Label>
              <Input
                id="edit-supplier-address-city"
                autoComplete="off"
                aria-invalid={errors.city ? true : undefined}
                aria-describedby={
                  errors.city ? "edit-supplier-address-city-error" : undefined
                }
                {...register("city")}
              />
              <FieldError
                id="edit-supplier-address-city-error"
                message={errors.city?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-supplier-address-street">
                {t("suppliers.editAddress.streetLabel")}
              </Label>
              <Input
                id="edit-supplier-address-street"
                autoComplete="off"
                aria-invalid={errors.street ? true : undefined}
                aria-describedby={
                  errors.street
                    ? "edit-supplier-address-street-error"
                    : undefined
                }
                {...register("street")}
              />
              <FieldError
                id="edit-supplier-address-street-error"
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
              {t("suppliers.editAddress.cancel")}
            </Button>
            <Button type="submit" disabled={updateAddress.isPending}>
              {updateAddress.isPending
                ? t("suppliers.editAddress.submitting")
                : t("suppliers.editAddress.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
