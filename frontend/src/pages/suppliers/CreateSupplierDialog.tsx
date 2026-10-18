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
  type SupplierFormValues,
  supplierFormSchema,
} from "@/pages/suppliers/supplierFormSchema"
import {
  resolveSupplierMutationError,
  useCreateSupplier,
} from "@/pages/suppliers/useSupplierMutations"

interface CreateSupplierDialogProps {
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

export function CreateSupplierDialog({
  open,
  onOpenChange,
}: CreateSupplierDialogProps) {
  const { t } = useTranslation()
  const createSupplier = useCreateSupplier()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: { country: "", city: "", street: "" },
    },
  })

  const errorMessage = createSupplier.error
    ? resolveSupplierMutationError(createSupplier.error, t)
    : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (createSupplier.isPending) {
      return
    }

    if (!nextOpen) {
      reset()
      createSupplier.reset()
    }

    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit((values) => {
    if (createSupplier.isPending) {
      return
    }

    createSupplier.mutate(values, {
      onSuccess: () => {
        reset()
        createSupplier.reset()
        onOpenChange(false)
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("suppliers.create.title")}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="create-supplier-name">
                {t("suppliers.create.nameLabel")}
              </Label>
              <Input
                id="create-supplier-name"
                autoComplete="off"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={
                  errors.name ? "create-supplier-name-error" : undefined
                }
                {...register("name")}
              />
              <FieldError
                id="create-supplier-name-error"
                message={errors.name?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-supplier-phone">
                {t("suppliers.create.phoneLabel")}
              </Label>
              <Input
                id="create-supplier-phone"
                type="tel"
                autoComplete="off"
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={
                  errors.phone ? "create-supplier-phone-error" : undefined
                }
                {...register("phone")}
              />
              <FieldError
                id="create-supplier-phone-error"
                message={errors.phone?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-supplier-country">
                {t("suppliers.create.countryLabel")}
              </Label>
              <Input
                id="create-supplier-country"
                autoComplete="off"
                aria-invalid={errors.address?.country ? true : undefined}
                aria-describedby={
                  errors.address?.country
                    ? "create-supplier-country-error"
                    : undefined
                }
                {...register("address.country")}
              />
              <FieldError
                id="create-supplier-country-error"
                message={errors.address?.country?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-supplier-city">
                {t("suppliers.create.cityLabel")}
              </Label>
              <Input
                id="create-supplier-city"
                autoComplete="off"
                aria-invalid={errors.address?.city ? true : undefined}
                aria-describedby={
                  errors.address?.city
                    ? "create-supplier-city-error"
                    : undefined
                }
                {...register("address.city")}
              />
              <FieldError
                id="create-supplier-city-error"
                message={errors.address?.city?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-supplier-street">
                {t("suppliers.create.streetLabel")}
              </Label>
              <Input
                id="create-supplier-street"
                autoComplete="off"
                aria-invalid={errors.address?.street ? true : undefined}
                aria-describedby={
                  errors.address?.street
                    ? "create-supplier-street-error"
                    : undefined
                }
                {...register("address.street")}
              />
              <FieldError
                id="create-supplier-street-error"
                message={errors.address?.street?.message}
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
              disabled={createSupplier.isPending}
              onClick={() => handleOpenChange(false)}
            >
              {t("suppliers.create.cancel")}
            </Button>
            <Button type="submit" disabled={createSupplier.isPending}>
              {createSupplier.isPending
                ? t("suppliers.create.submitting")
                : t("suppliers.create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
