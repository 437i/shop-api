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
  resolveSupplierMutationError,
  useDeleteSupplier,
} from "@/pages/suppliers/useSupplierMutations"
import type { components } from "@/shared/api/generated/schema"

type SupplierResponse = components["schemas"]["internal_supplier.Response"]

interface DeleteSupplierDialogProps {
  supplier: SupplierResponse | null
  onOpenChange: (open: boolean) => void
}

export function DeleteSupplierDialog({
  supplier,
  onOpenChange,
}: DeleteSupplierDialogProps) {
  const { t } = useTranslation()
  const deleteSupplier = useDeleteSupplier()

  const errorMessage = deleteSupplier.error
    ? resolveSupplierMutationError(deleteSupplier.error, t)
    : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (deleteSupplier.isPending) {
      return
    }

    if (!nextOpen) {
      deleteSupplier.reset()
    }

    onOpenChange(nextOpen)
  }

  const handleConfirm = () => {
    if (!supplier?.id || deleteSupplier.isPending) {
      return
    }

    deleteSupplier.mutate(supplier.id, {
      onSuccess: () => {
        deleteSupplier.reset()
        onOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={supplier !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("suppliers.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("suppliers.delete.description", {
              name: supplier?.name ?? "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage ? (
          <p role="alert" className="text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteSupplier.isPending}>
            {t("suppliers.delete.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteSupplier.isPending}
            onClick={handleConfirm}
          >
            {deleteSupplier.isPending
              ? t("suppliers.delete.deleting")
              : t("suppliers.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
