import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  type DecreaseStockFormValues,
  createDecreaseStockSchema,
  isValidPositiveInteger,
} from "@/pages/products/productFormSchema"
import {
  resolveProductMutationError,
  useDecreaseStock,
} from "@/pages/products/useProductMutations"
import type { components } from "@/shared/api/generated/schema"

type ProductListResponse =
  components["schemas"]["internal_product.ListResponse"]

interface DecreaseStockDialogProps {
  product: ProductListResponse | null
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

export function DecreaseStockDialog({
  product,
  onOpenChange,
}: DecreaseStockDialogProps) {
  const { t } = useTranslation()
  const decreaseStock = useDecreaseStock()
  const open = product !== null
  const availableStock = product?.available_stock ?? 0

  const schema = useMemo(
    () => createDecreaseStockSchema(availableStock),
    [availableStock],
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DecreaseStockFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "" },
  })

  useEffect(() => {
    if (open) {
      reset({ amount: "" })
    }
  }, [open, product, reset])

  const errorMessage = decreaseStock.error
    ? resolveProductMutationError(decreaseStock.error, t)
    : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (decreaseStock.isPending) {
      return
    }

    if (!nextOpen) {
      reset()
      decreaseStock.reset()
    }

    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit((values) => {
    if (!product?.id || decreaseStock.isPending) {
      return
    }

    decreaseStock.mutate(
      { productId: product.id, amount: values.amount },
      {
        onSuccess: () => {
          reset()
          decreaseStock.reset()
          onOpenChange(false)
        },
      },
    )
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("products.decreaseStock.title")}</DialogTitle>
          <DialogDescription>
            {t("products.decreaseStock.description", {
              name: product?.name ?? "",
              stock: product?.available_stock ?? "",
            })}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="decrease-stock-amount">
              {t("products.decreaseStock.amountLabel")}
            </Label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => {
                const showZeroWarning =
                  isValidPositiveInteger(field.value) &&
                  Number(field.value) === availableStock

                return (
                  <>
                    <Input
                      id="decrease-stock-amount"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-invalid={errors.amount ? true : undefined}
                      aria-describedby={
                        errors.amount
                          ? "decrease-stock-amount-error"
                          : undefined
                      }
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FieldError
                      id="decrease-stock-amount-error"
                      message={errors.amount?.message}
                    />
                    {showZeroWarning ? (
                      <p className="text-xs text-muted-foreground">
                        {t("products.decreaseStock.zeroWarning")}
                      </p>
                    ) : null}
                  </>
                )
              }}
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
              disabled={decreaseStock.isPending}
              onClick={() => handleOpenChange(false)}
            >
              {t("products.decreaseStock.cancel")}
            </Button>
            <Button type="submit" disabled={decreaseStock.isPending}>
              {decreaseStock.isPending
                ? t("products.decreaseStock.submitting")
                : t("products.decreaseStock.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
