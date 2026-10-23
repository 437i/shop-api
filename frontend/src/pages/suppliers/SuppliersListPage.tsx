import { DeliveryTruck01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

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
import { CreateSupplierDialog } from "@/pages/suppliers/CreateSupplierDialog"
import { DeleteSupplierDialog } from "@/pages/suppliers/DeleteSupplierDialog"
import { EditSupplierAddressDialog } from "@/pages/suppliers/EditSupplierAddressDialog"
import { SUPPLIERS_QUERY_KEY } from "@/pages/suppliers/useSupplierMutations"
import { ApiError, NetworkError, apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"
import { RetryableErrorAlert } from "@/shared/feedback/RetryableErrorAlert"

type SupplierResponse = components["schemas"]["internal_supplier.Response"]

type TranslateFn = (key: string) => string

const SKELETON_ROWS = 5
const SKELETON_COLUMNS = 5

function resolveSuppliersError(
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

function SuppliersTableSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="grid rounded-lg border"
    >
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <div
          key={row}
          className="grid grid-cols-5 gap-4 border-b px-2 py-3 last:border-b-0"
        >
          {Array.from({ length: SKELETON_COLUMNS }, (_, column) => (
            <Skeleton key={column} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

function SuppliersEmptyState() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <HugeiconsIcon
          icon={DeliveryTruck01Icon}
          strokeWidth={2}
          className="size-6 text-muted-foreground"
        />
      </div>
      <p className="text-sm text-muted-foreground">{t("suppliers.empty")}</p>
    </div>
  )
}

interface SuppliersTableProps {
  suppliers: SupplierResponse[]
  onDetails: (supplier: SupplierResponse) => void
  onEditAddress: (supplier: SupplierResponse) => void
  onDelete: (supplier: SupplierResponse) => void
}

function SuppliersTable({
  suppliers,
  onDetails,
  onEditAddress,
  onDelete,
}: SuppliersTableProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("suppliers.columns.name")}</TableHead>
            <TableHead>{t("suppliers.columns.phone")}</TableHead>
            <TableHead>{t("suppliers.columns.country")}</TableHead>
            <TableHead>{t("suppliers.columns.city")}</TableHead>
            <TableHead>{t("suppliers.columns.street")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier, index) => (
            <TableRow key={supplier.id ?? index}>
              <TableCell>{supplier.name ?? ""}</TableCell>
              <TableCell>{supplier.phone_number ?? ""}</TableCell>
              <TableCell>{supplier.address?.country ?? ""}</TableCell>
              <TableCell>{supplier.address?.city ?? ""}</TableCell>
              <TableCell>
                <div className="flex items-center justify-between gap-2">
                  <span>{supplier.address?.street ?? ""}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("suppliers.actions.menuLabel", {
                            name: supplier.name ?? "",
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
                        onClick={() => onDetails(supplier)}
                      >
                        {t("suppliers.actions.details")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onEditAddress(supplier)}
                      >
                        {t("suppliers.actions.editAddress")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        aria-label={t("suppliers.actions.deleteNamed", {
                          name: supplier.name ?? "",
                        })}
                        onClick={() => onDelete(supplier)}
                      >
                        {t("suppliers.actions.delete")}
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

export function SuppliersListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [supplierToEditAddress, setSupplierToEditAddress] =
    useState<SupplierResponse | null>(null)
  const [supplierToDelete, setSupplierToDelete] =
    useState<SupplierResponse | null>(null)
  const [listError, setListError] = useState<unknown>(null)

  const suppliersQuery = useQuery({
    queryKey: SUPPLIERS_QUERY_KEY,
    queryFn: async () => {
      try {
        const suppliers = await apiClient.get<SupplierResponse[]>("/suppliers")
        setListError(null)

        return suppliers
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          setListError(error)
        }

        throw error
      }
    },
  })

  const currentListError = suppliersQuery.error ?? listError
  const errorMessage = currentListError
    ? resolveSuppliersError(currentListError, t)
    : null

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">{t("navigation.suppliers")}</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          {t("suppliers.actions.addSupplier")}
        </Button>
      </div>
      {suppliersQuery.isLoading && !errorMessage ? (
        <SuppliersTableSkeleton label={t("suppliers.loading")} />
      ) : null}
      {errorMessage ? (
        <RetryableErrorAlert
          message={errorMessage}
          onRetry={() => void suppliersQuery.refetch()}
          isRetrying={suppliersQuery.isFetching}
        />
      ) : null}
      {suppliersQuery.isSuccess && suppliersQuery.data.length === 0 ? (
        <SuppliersEmptyState />
      ) : null}
      {suppliersQuery.isSuccess && suppliersQuery.data.length > 0 ? (
        <SuppliersTable
          suppliers={suppliersQuery.data}
          onDetails={(supplier) => {
            navigate(`/suppliers/${supplier.id}`)
          }}
          onEditAddress={setSupplierToEditAddress}
          onDelete={setSupplierToDelete}
        />
      ) : null}
      <CreateSupplierDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
      <EditSupplierAddressDialog
        supplier={supplierToEditAddress}
        onOpenChange={(open) => {
          if (!open) {
            setSupplierToEditAddress(null)
          }
        }}
      />
      <DeleteSupplierDialog
        supplier={supplierToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setSupplierToDelete(null)
          }
        }}
      />
    </section>
  )
}
