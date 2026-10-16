import { UserGroupIcon } from "@hugeicons/core-free-icons"
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
import {
  ApiError,
  NetworkError,
  apiClient,
} from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"

type ClientResponse = components["schemas"]["internal_client.Response"]

type TranslateFn = (key: string) => string

const CLIENTS_QUERY_KEY = ["clients"]

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

function ClientsTable({ clients }: { clients: ClientResponse[] }) {
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
                {formatRegistrationDate(client.registration_date)}
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

  const clientsQuery = useQuery({
    queryKey: CLIENTS_QUERY_KEY,
    queryFn: () => apiClient.get<ClientResponse[]>("/clients"),
  })

  const errorMessage = clientsQuery.error
    ? resolveClientsError(clientsQuery.error, t)
    : null

  return (
    <section className="grid gap-4">
      <h1 className="text-lg font-semibold">{t("navigation.clients")}</h1>
      {clientsQuery.isLoading ? (
        <ClientsTableSkeleton label={t("clients.loading")} />
      ) : null}
      {clientsQuery.isError && errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {clientsQuery.isSuccess && clientsQuery.data.length === 0 ? (
        <ClientsEmptyState />
      ) : null}
      {clientsQuery.isSuccess && clientsQuery.data.length > 0 ? (
        <ClientsTable clients={clientsQuery.data} />
      ) : null}
    </section>
  )
}
