import { MoreHorizontalIcon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"

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
import { CreateClientDialog } from "@/pages/clients/CreateClientDialog"
import { DeleteClientDialog } from "@/pages/clients/DeleteClientDialog"
import { EditClientAddressDialog } from "@/pages/clients/EditClientAddressDialog"
import { CLIENTS_QUERY_KEY } from "@/pages/clients/useClientMutations"
import {
  ApiError,
  NetworkError,
  apiClient,
} from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"
import { RetryableErrorAlert } from "@/shared/feedback/RetryableErrorAlert"

type ClientResponse = components["schemas"]["internal_client.Response"]

type TranslateFn = (key: string) => string

const SKELETON_ROWS = 5
const SKELETON_COLUMNS = 5

function resolveClientsError(
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

    if (error.status === 400) {
      return error.responseMessage ?? translate("errors.invalidRequest")
    }

    return error.responseMessage ?? translate("errors.server")
  }

  return translate("errors.server")
}

function formatRegistrationDate(value: string | undefined): string {
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

function ClientsTableSkeleton({ label }: { label: string }) {
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

function ClientsEmptyState() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <HugeiconsIcon
          icon={UserGroupIcon}
          strokeWidth={2}
          className="size-6 text-muted-foreground"
        />
      </div>
      <p className="text-sm text-muted-foreground">{t("clients.empty")}</p>
    </div>
  )
}

interface ClientsTableProps {
  clients: ClientResponse[]
  onEditAddress: (client: ClientResponse) => void
  onDelete: (client: ClientResponse) => void
}

function ClientsTable({ clients, onEditAddress, onDelete }: ClientsTableProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("clients.columns.name")}</TableHead>
            <TableHead>{t("clients.columns.surname")}</TableHead>
            <TableHead>{t("clients.columns.birthday")}</TableHead>
            <TableHead>{t("clients.columns.gender")}</TableHead>
            <TableHead>{t("clients.columns.registrationDate")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client, index) => (
            <TableRow key={client.id ?? index}>
              <TableCell>{client.name ?? ""}</TableCell>
              <TableCell>{client.surname ?? ""}</TableCell>
              <TableCell>{client.birthday ?? ""}</TableCell>
              <TableCell>{client.gender ?? ""}</TableCell>
              <TableCell>
                <div className="flex items-center justify-between gap-2">
                  <span>{formatRegistrationDate(client.registration_date)}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("clients.actions.menuLabel", {
                            name: client.name ?? "",
                            surname: client.surname ?? "",
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
                        onClick={() => onEditAddress(client)}
                      >
                        {t("clients.actions.editAddress")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        aria-label={t("clients.actions.deleteNamed", {
                          name: client.name ?? "",
                          surname: client.surname ?? "",
                        })}
                        onClick={() => onDelete(client)}
                      >
                        {t("clients.actions.delete")}
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

export function ClientsListPage() {
  const { t } = useTranslation()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [clientToEditAddress, setClientToEditAddress] =
    useState<ClientResponse | null>(null)
  const [clientToDelete, setClientToDelete] =
    useState<ClientResponse | null>(null)
  const [listError, setListError] = useState<unknown>(null)

  const clientsQuery = useQuery({
    queryKey: CLIENTS_QUERY_KEY,
    queryFn: async () => {
      try {
        const clients = await apiClient.get<ClientResponse[]>("/clients")
        setListError(null)

        return clients
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          setListError(error)
        }

        throw error
      }
    },
  })

  const currentListError = clientsQuery.error ?? listError
  const errorMessage = currentListError
    ? resolveClientsError(currentListError, t)
    : null

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">{t("navigation.clients")}</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          {t("clients.actions.addClient")}
        </Button>
      </div>
      {clientsQuery.isLoading && !errorMessage ? (
        <ClientsTableSkeleton label={t("clients.loading")} />
      ) : null}
      {errorMessage ? (
        <RetryableErrorAlert
          message={errorMessage}
          onRetry={() => void clientsQuery.refetch()}
          isRetrying={clientsQuery.isFetching}
        />
      ) : null}
      {clientsQuery.isSuccess && clientsQuery.data.length === 0 ? (
        <ClientsEmptyState />
      ) : null}
      {clientsQuery.isSuccess && clientsQuery.data.length > 0 ? (
        <ClientsTable
          clients={clientsQuery.data}
          onEditAddress={setClientToEditAddress}
          onDelete={setClientToDelete}
        />
      ) : null}
      <CreateClientDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <EditClientAddressDialog
        client={clientToEditAddress}
        onOpenChange={(open) => {
          if (!open) {
            setClientToEditAddress(null)
          }
        }}
      />
      <DeleteClientDialog
        client={clientToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setClientToDelete(null)
          }
        }}
      />
    </section>
  )
}
