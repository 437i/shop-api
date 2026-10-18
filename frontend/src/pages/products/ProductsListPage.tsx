import { PackageIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError, NetworkError, apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"

type ProductListResponse = components["schemas"]["internal_product.ListResponse"]

type TranslateFn = (key: string) => string

const SKELETON_ROWS = 5
const SKELETON_COLUMNS = 4

function resolveProductsError(
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

    return error.responseMessage ?? translate("errors.server")
  }

  return translate("errors.server")
}

function ProductsTableSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="grid rounded-lg border"
    >
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

function ProductsEmptyState() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <HugeiconsIcon
          icon={PackageIcon}
          strokeWidth={2}
          className="size-6 text-muted-foreground"
        />
      </div>
      <p className="text-sm text-muted-foreground">{t("products.empty")}</p>
    </div>
  )
}

function ProductsTable({ products }: { products: ProductListResponse[] }) {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("products.columns.name")}</TableHead>
            <TableHead>{t("products.columns.category")}</TableHead>
            <TableHead>{t("products.columns.price")}</TableHead>
            <TableHead>{t("products.columns.availableStock")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product, index) => (
            <TableRow key={product.id ?? index}>
              <TableCell>{product.name ?? ""}</TableCell>
              <TableCell>{product.category?.name ?? ""}</TableCell>
              <TableCell>{product.price ?? ""}</TableCell>
              <TableCell>{product.available_stock ?? ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function ProductsListPage() {
  const { t } = useTranslation()

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => apiClient.get<ProductListResponse[]>("/products"),
  })

  const errorMessage = productsQuery.error
    ? resolveProductsError(productsQuery.error, t)
    : null

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">{t("navigation.products")}</h1>
      </div>
      {productsQuery.isLoading ? (
        <ProductsTableSkeleton label={t("products.loading")} />
      ) : null}
      {productsQuery.isError && errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {productsQuery.isSuccess && productsQuery.data.length === 0 ? (
        <ProductsEmptyState />
      ) : null}
      {productsQuery.isSuccess && productsQuery.data.length > 0 ? (
        <ProductsTable products={productsQuery.data} />
      ) : null}
    </section>
  )
}
