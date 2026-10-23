import type { ReactNode } from "react"
import { useNavigate, useParams } from "react-router"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductImage } from "@/features/product-images/ProductImage"
import { ProductImageDialog } from "@/features/product-images/ProductImageDialog"
import { useProductImage } from "@/features/product-images/useProductImage"
import { useProductDetails } from "@/pages/products/useProductDetails"
import { ApiError, NetworkError } from "@/shared/api/client"
import { RetryableErrorAlert } from "@/shared/feedback/RetryableErrorAlert"

type TranslateFn = (key: string) => string

const SKELETON_ROWS = 6
const SKELETON_COLUMNS = 4

function resolveProductDetailsError(
  error: unknown,
  translate: TranslateFn,
): string | null {
  if (error instanceof NetworkError) {
    return translate("errors.network")
  }

  if (error instanceof ApiError) {
    if (error.status === 401) {
      return null
    }

    if (error.status === 503) {
      return translate("errors.server")
    }

    if (error.status === 400) {
      return error.responseMessage ?? translate("errors.invalidRequest")
    }

    return error.responseMessage ?? translate("errors.server")
  }

  return translate("errors.server")
}

function formatLastUpdateDate(value: string | undefined): string {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const pad = (part: number) => String(part).padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function ProductDetailsSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid rounded-lg border">
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <div
          key={row}
          className="grid grid-cols-4 gap-4 border-b px-2 py-3 last:border-b-0"
        >
          {Array.from({ length: SKELETON_COLUMNS }, (_, column) => (
            <Skeleton key={column} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

function ProductNotFound({ message, onBack }: { message: string; onBack: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onBack}>
        {t("productDetails.back")}
      </Button>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export function ProductDetailsPage() {
  const params = useParams()
  const productId = params.id ?? ""
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)

  const productQuery = useProductDetails(productId)
  const photoQuery = useProductImage(productId, true)

  const errorMessage = productQuery.error
    ? resolveProductDetailsError(productQuery.error, t)
    : null
  const product = productQuery.product
  const productName = product?.name ?? ""

  const navigateToProducts = () => {
    navigate("/products")
  }

  return (
    <section className="grid gap-4">
      {productQuery.isLoading ? (
        <ProductDetailsSkeleton label={t("productDetails.loading")} />
      ) : null}

      {!productQuery.isLoading && productQuery.error ? (
        errorMessage ? (
          <RetryableErrorAlert
            message={errorMessage}
            onRetry={productQuery.refetch}
            isRetrying={productQuery.isFetching}
          />
        ) : null
      ) : null}

      {!productQuery.isLoading && !productQuery.error && product === null ? (
        <ProductNotFound
          message={t("errors.productNotFound")}
          onBack={navigateToProducts}
        />
      ) : null}

      {!productQuery.isLoading && !productQuery.error && product ? (
        <Card>
          <CardHeader>
            <CardTitle>{productName}</CardTitle>
            <CardAction>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  aria-label={t("products.actions.imageNamed", {
                    name: productName,
                  })}
                  onClick={() => setIsPhotoDialogOpen(true)}
                >
                  {t("products.actions.image")}
                </Button>
                <Button variant="outline" onClick={navigateToProducts}>
                  {t("productDetails.back")}
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <DetailField
                label={t("products.columns.category")}
                value={product.category?.name ?? ""}
              />
              <DetailField
                label={t("products.columns.price")}
                value={product.price ?? ""}
              />
              <DetailField
                label={t("products.columns.availableStock")}
                value={product.available_stock ?? ""}
              />
              <DetailField
                label={t("productDetails.lastUpdate")}
                value={formatLastUpdateDate(product.last_update_date)}
              />
            </div>
            <div className="grid gap-2 rounded-lg border p-3">
              <span className="text-xs font-semibold text-muted-foreground">
                {t("productDetails.supplierTitle")}
              </span>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <DetailField
                  label={t("suppliers.columns.name")}
                  value={product.supplier?.name ?? ""}
                />
                <DetailField
                  label={t("suppliers.columns.phone")}
                  value={product.supplier?.phone_number ?? ""}
                />
                <DetailField
                  label={t("suppliers.columns.country")}
                  value={product.supplier?.address?.country ?? ""}
                />
                <DetailField
                  label={t("suppliers.columns.city")}
                  value={product.supplier?.address?.city ?? ""}
                />
                <DetailField
                  label={t("suppliers.columns.street")}
                  value={product.supplier?.address?.street ?? ""}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <span className="font-medium">{t("productImages.title")}</span>
              {photoQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">
                  {t("productImages.loading")}
                </p>
              ) : null}
              <ProductImage
                image={photoQuery.image}
                productName={productName}
                isLoading={photoQuery.isLoading}
                errorMessage={photoQuery.errorMessage}
              />
              {photoQuery.errorMessage ? (
                <p role="alert" className="text-xs text-destructive">
                  {photoQuery.errorMessage}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ProductImageDialog
        key={isPhotoDialogOpen ? productId : "closed"}
        productId={isPhotoDialogOpen && product?.id ? product.id : null}
        productName={productName}
        onOpenChange={(open) => {
          if (!open) {
            setIsPhotoDialogOpen(false)
          }
        }}
      />
    </section>
  )
}
