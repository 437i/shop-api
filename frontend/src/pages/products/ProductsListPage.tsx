import { MoreHorizontalIcon, PackageIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CreateProductDialog } from "@/pages/products/CreateProductDialog"
import { DecreaseStockDialog } from "@/pages/products/DecreaseStockDialog"
import { DeleteProductDialog } from "@/pages/products/DeleteProductDialog"
import { PRODUCTS_QUERY_KEY } from "@/pages/products/useProductMutations"
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

interface ProductsTableProps {
  products: ProductListResponse[]
  onDecreaseStock: (product: ProductListResponse) => void
  onDelete: (product: ProductListResponse) => void
}

function ProductsTable({
  products,
  onDecreaseStock,
  onDelete,
}: ProductsTableProps) {
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
              <TableCell>
                <div className="flex items-center justify-between gap-2">
                  <span>{product.available_stock ?? ""}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("products.actions.menuLabel", {
                            name: product.name ?? "",
                          })}
                        />
                      }
                    >
                      <HugeiconsIcon
                        icon={MoreHorizontalIcon}
                        strokeWidth={2}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onDecreaseStock(product)}
                      >
                        {t("products.actions.decreaseStock")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        aria-label={t("products.actions.deleteNamed", {
                          name: product.name ?? "",
                        })}
                        onClick={() => onDelete(product)}
                      >
                        {t("products.actions.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function ProductsListPage() {
  const { t } = useTranslation()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [productToDecreaseStock, setProductToDecreaseStock] =
    useState<ProductListResponse | null>(null)
  const [productToDelete, setProductToDelete] =
    useState<ProductListResponse | null>(null)

  const productsQuery = useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: () => apiClient.get<ProductListResponse[]>("/products"),
  })

  const errorMessage = productsQuery.error
    ? resolveProductsError(productsQuery.error, t)
    : null

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">{t("navigation.products")}</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          {t("products.actions.addProduct")}
        </Button>
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
        <ProductsTable
          products={productsQuery.data}
          onDecreaseStock={setProductToDecreaseStock}
          onDelete={setProductToDelete}
        />
      ) : null}
      <CreateProductDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <DecreaseStockDialog
        product={productToDecreaseStock}
        onOpenChange={(open) => {
          if (!open) {
            setProductToDecreaseStock(null)
          }
        }}
      />
      <DeleteProductDialog
        product={productToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setProductToDelete(null)
          }
        }}
      />
    </section>
  )
}
