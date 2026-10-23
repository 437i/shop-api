import type { ReactNode } from "react"
import { useNavigate, useParams } from "react-router"
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
import { useSupplierDetails } from "@/pages/suppliers/useSupplierDetails"
import { ApiError, NetworkError } from "@/shared/api/client"
import { RetryableErrorAlert } from "@/shared/feedback/RetryableErrorAlert"

type TranslateFn = (key: string) => string

const SKELETON_ROWS = 6
const SKELETON_COLUMNS = 4

function resolveSupplierDetailsError(
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

function SupplierDetailsSkeleton({ label }: { label: string }) {
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

function SupplierNotFound({
  message,
  onBack,
}: {
  message: string
  onBack: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onBack}>
        {t("supplierDetails.back")}
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

export function SupplierDetailsPage() {
  const params = useParams()
  const supplierId = params.id ?? ""
  const navigate = useNavigate()
  const { t } = useTranslation()

  const supplierQuery = useSupplierDetails(supplierId)

  const errorMessage = supplierQuery.error
    ? resolveSupplierDetailsError(supplierQuery.error, t)
    : null
  const supplier = supplierQuery.supplier
  const supplierName = supplier?.name ?? ""

  const navigateToSuppliers = () => {
    navigate("/suppliers")
  }

  return (
    <section className="grid gap-4">
      {supplierQuery.isLoading ? (
        <SupplierDetailsSkeleton label={t("supplierDetails.loading")} />
      ) : null}

      {!supplierQuery.isLoading && supplierQuery.error ? (
        errorMessage ? (
          <RetryableErrorAlert
            message={errorMessage}
            onRetry={supplierQuery.refetch}
            isRetrying={supplierQuery.isFetching}
          />
        ) : null
      ) : null}

      {!supplierQuery.isLoading && !supplierQuery.error && supplier === null ? (
        <SupplierNotFound
          message={t("errors.supplierNotFound")}
          onBack={navigateToSuppliers}
        />
      ) : null}

      {!supplierQuery.isLoading && !supplierQuery.error && supplier ? (
        <Card>
          <CardHeader>
            <CardTitle>{supplierName}</CardTitle>
            <CardAction>
              <Button variant="outline" onClick={navigateToSuppliers}>
                {t("supplierDetails.back")}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <DetailField
                label={t("suppliers.columns.name")}
                value={supplier.name ?? ""}
              />
              <DetailField
                label={t("suppliers.columns.phone")}
                value={supplier.phone_number ?? ""}
              />
            </div>
            <div className="grid gap-2 rounded-lg border p-3">
              <span className="text-xs font-semibold text-muted-foreground">
                {t("supplierDetails.addressTitle")}
              </span>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <DetailField
                  label={t("suppliers.columns.country")}
                  value={supplier.address?.country ?? ""}
                />
                <DetailField
                  label={t("suppliers.columns.city")}
                  value={supplier.address?.city ?? ""}
                />
                <DetailField
                  label={t("suppliers.columns.street")}
                  value={supplier.address?.street ?? ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
