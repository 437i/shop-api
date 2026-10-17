import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CLIENT_GENDERS,
  type ClientFormValues,
  clientFormSchema,
} from "@/pages/clients/clientFormSchema"
import {
  resolveClientMutationError,
  useCreateClient,
} from "@/pages/clients/useClientMutations"

interface CreateClientDialogProps {
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

export function CreateClientDialog({
  open,
  onOpenChange,
}: CreateClientDialogProps) {
  const { t } = useTranslation()
  const createClient = useCreateClient()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      surname: "",
      birthday: "",
      address: { country: "", city: "", street: "" },
    },
  })

  const errorMessage = createClient.error
    ? resolveClientMutationError(createClient.error, t)
    : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (createClient.isPending) {
      return
    }

    if (!nextOpen) {
      reset()
      createClient.reset()
    }

    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit((values) => {
    if (createClient.isPending) {
      return
    }

    createClient.mutate(values, {
      onSuccess: () => {
        reset()
        createClient.reset()
        onOpenChange(false)
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("clients.create.title")}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="create-client-name">
                {t("clients.create.nameLabel")}
              </Label>
              <Input
                id="create-client-name"
                autoComplete="off"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={
                  errors.name ? "create-client-name-error" : undefined
                }
                {...register("name")}
              />
              <FieldError
                id="create-client-name-error"
                message={errors.name?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-client-surname">
                {t("clients.create.surnameLabel")}
              </Label>
              <Input
                id="create-client-surname"
                autoComplete="off"
                aria-invalid={errors.surname ? true : undefined}
                aria-describedby={
                  errors.surname ? "create-client-surname-error" : undefined
                }
                {...register("surname")}
              />
              <FieldError
                id="create-client-surname-error"
                message={errors.surname?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-client-birthday">
                {t("clients.create.birthdayLabel")}
              </Label>
              <Input
                id="create-client-birthday"
                type="date"
                aria-invalid={errors.birthday ? true : undefined}
                aria-describedby={
                  errors.birthday ? "create-client-birthday-error" : undefined
                }
                {...register("birthday")}
              />
              <FieldError
                id="create-client-birthday-error"
                message={errors.birthday?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-client-gender">
                {t("clients.create.genderLabel")}
              </Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select
                    value={field.value ?? null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger
                      id="create-client-gender"
                      className="w-full"
                      aria-invalid={errors.gender ? true : undefined}
                      aria-describedby={
                        errors.gender ? "create-client-gender-error" : undefined
                      }
                    >
                      <SelectValue
                        placeholder={t("clients.create.genderPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_GENDERS.map((gender) => (
                        <SelectItem key={gender} value={gender}>
                          {t(`gender.${gender}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError
                id="create-client-gender-error"
                message={errors.gender?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-client-country">
                {t("clients.create.countryLabel")}
              </Label>
              <Input
                id="create-client-country"
                autoComplete="off"
                aria-invalid={errors.address?.country ? true : undefined}
                aria-describedby={
                  errors.address?.country
                    ? "create-client-country-error"
                    : undefined
                }
                {...register("address.country")}
              />
              <FieldError
                id="create-client-country-error"
                message={errors.address?.country?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-client-city">
                {t("clients.create.cityLabel")}
              </Label>
              <Input
                id="create-client-city"
                autoComplete="off"
                aria-invalid={errors.address?.city ? true : undefined}
                aria-describedby={
                  errors.address?.city
                    ? "create-client-city-error"
                    : undefined
                }
                {...register("address.city")}
              />
              <FieldError
                id="create-client-city-error"
                message={errors.address?.city?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-client-street">
                {t("clients.create.streetLabel")}
              </Label>
              <Input
                id="create-client-street"
                autoComplete="off"
                aria-invalid={errors.address?.street ? true : undefined}
                aria-describedby={
                  errors.address?.street
                    ? "create-client-street-error"
                    : undefined
                }
                {...register("address.street")}
              />
              <FieldError
                id="create-client-street-error"
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
              disabled={createClient.isPending}
              onClick={() => handleOpenChange(false)}
            >
              {t("clients.create.cancel")}
            </Button>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending
                ? t("clients.create.submitting")
                : t("clients.create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
