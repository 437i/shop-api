import { useTranslation } from "react-i18next"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  resolveClientMutationError,
  useDeleteClient,
} from "@/pages/clients/useClientMutations"
import type { components } from "@/shared/api/generated/schema"

type ClientResponse = components["schemas"]["internal_client.Response"]

interface DeleteClientDialogProps {
  client: ClientResponse | null
  onOpenChange: (open: boolean) => void
}

export function DeleteClientDialog({
  client,
  onOpenChange,
}: DeleteClientDialogProps) {
  const { t } = useTranslation()
  const deleteClient = useDeleteClient()

  const errorMessage = deleteClient.error
    ? resolveClientMutationError(deleteClient.error, t)
    : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (deleteClient.isPending) {
      return
    }

    if (!nextOpen) {
      deleteClient.reset()
    }

    onOpenChange(nextOpen)
  }

  const handleConfirm = () => {
    if (!client?.id || deleteClient.isPending) {
      return
    }

    deleteClient.mutate(client.id, {
      onSuccess: () => {
        deleteClient.reset()
        onOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={client !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("clients.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("clients.delete.description", {
              name: client?.name ?? "",
              surname: client?.surname ?? "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage ? (
          <p role="alert" className="text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteClient.isPending}>
            {t("clients.delete.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteClient.isPending}
            onClick={handleConfirm}
          >
            {deleteClient.isPending
              ? t("clients.delete.deleting")
              : t("clients.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
