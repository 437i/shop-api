import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
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
  type ProductFormValues,
  createProductSchema,
} from "@/pages/products/productFormSchema"
import {
  resolveProductMutationError,
  useCreateProduct,
} from "@/pages/products/useProductMutations"
import { SUPPLIERS_QUERY_KEY } from "@/pages/suppliers/useSupplierMutations"
import { apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"

type SupplierResponse = components["schemas"]["internal_supplier.Response"]

interface CreateProductDialogProps {
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

export function CreateProductDialog({
  open,
  onOpenChange,
}: CreateProductDialogProps) {
  const { t } = useTranslation()
  const createProduct = useCreateProduct()

  const suppliersQuery = useQuery({
    queryKey: SUPPLIERS_QUERY_KEY,
    queryFn: () => apiClient.get<SupplierResponse[]>("/suppliers"),
    enabled: open,
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      category: "",
      price: "",
      stock: "",
      supplierId: "",
    },
  })

  const suppliers = suppliersQuery.data ?? []
  const hasSuppliers = suppliersQuery.isSuccess && suppliers.length > 0

  const errorMessage = createProduct.error
    ? resolveProductMutationError(
        createProduct.error,
        t,
        "errors.supplierNotFound",
      )
    : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (createProduct.isPending) {
      return
    }

    if (!nextOpen) {
      reset()
      createProduct.reset()
    }

    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit((values) => {
    if (createProduct.isPending || !hasSuppliers) {
      return
    }

    createProduct.mutate(values, {
      onSuccess: () => {
        reset()
        createProduct.reset()
        onOpenChange(false)
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("products.create.title")}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="create-product-name">
                {t("products.create.nameLabel")}
              </Label>
              <Input
                id="create-product-name"
                autoComplete="off"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={
                  errors.name ? "create-product-name-error" : undefined
                }
                {...register("name")}
              />
              <FieldError
                id="create-product-name-error"
                message={errors.name?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-product-category">
                {t("products.create.categoryLabel")}
              </Label>
              <Input
                id="create-product-category"
                autoComplete="off"
                aria-invalid={errors.category ? true : undefined}
                aria-describedby={
                  errors.category ? "create-product-category-error" : undefined
                }
                {...register("category")}
              />
              <FieldError
                id="create-product-category-error"
                message={errors.category?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-product-price">
                {t("products.create.priceLabel")}
              </Label>
              <Input
                id="create-product-price"
                inputMode="decimal"
                autoComplete="off"
                aria-invalid={errors.price ? true : undefined}
                aria-describedby={
                  errors.price ? "create-product-price-error" : undefined
                }
                {...register("price")}
              />
              <FieldError
                id="create-product-price-error"
                message={errors.price?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-product-stock">
                {t("products.create.stockLabel")}
              </Label>
              <Input
                id="create-product-stock"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={errors.stock ? true : undefined}
                aria-describedby={
                  errors.stock ? "create-product-stock-error" : undefined
                }
                {...register("stock")}
              />
              <FieldError
                id="create-product-stock-error"
                message={errors.stock?.message}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-product-supplier">
                {t("products.create.supplierLabel")}
              </Label>
              <Controller
                control={control}
                name="supplierId"
                render={({ field }) => (
                  <Select
                    value={field.value === "" ? null : field.value}
                    onValueChange={(value) => field.onChange(value ?? "")}
                    disabled={!hasSuppliers}
                  >
                    <SelectTrigger
                      id="create-product-supplier"
                      className="w-full"
                      aria-invalid={errors.supplierId ? true : undefined}
                      aria-describedby={
                        errors.supplierId
                          ? "create-product-supplier-error"
                          : undefined
                      }
                    >
                      <SelectValue
                        placeholder={t("products.create.supplierPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem
                          key={supplier.id}
                          value={supplier.id ?? ""}
                        >
                          {supplier.name ?? ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {suppliersQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">
                  {t("products.create.suppliersLoading")}
                </p>
              ) : null}
              {suppliersQuery.isError ? (
                <p className="text-xs text-destructive">
                  {t("products.create.suppliersError")}
                </p>
              ) : null}
              {suppliersQuery.isSuccess && suppliers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("products.create.suppliersEmpty")}
                </p>
              ) : null}
              <FieldError
                id="create-product-supplier-error"
                message={errors.supplierId?.message}
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
              disabled={createProduct.isPending}
              onClick={() => handleOpenChange(false)}
            >
              {t("products.create.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createProduct.isPending || !hasSuppliers}
            >
              {createProduct.isPending
                ? t("products.create.submitting")
                : t("products.create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
