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
  resolveProductMutationError,
  useDeleteProduct,
} from "@/pages/products/useProductMutations"
import type { components } from "@/shared/api/generated/schema"

type ProductListResponse =
  components["schemas"]["internal_product.ListResponse"]

interface DeleteProductDialogProps {
  product: ProductListResponse | null
  onOpenChange: (open: boolean) => void
}

export function DeleteProductDialog({
  product,
  onOpenChange,
}: DeleteProductDialogProps) {
  const { t } = useTranslation()
  const deleteProduct = useDeleteProduct()

  const errorMessage = deleteProduct.error
    ? resolveProductMutationError(deleteProduct.error, t)
    : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (deleteProduct.isPending) {
      return
    }

    if (!nextOpen) {
      deleteProduct.reset()
    }

    onOpenChange(nextOpen)
  }

  const handleConfirm = () => {
    if (!product?.id || deleteProduct.isPending) {
      return
    }

    deleteProduct.mutate(product.id, {
      onSuccess: () => {
        deleteProduct.reset()
        onOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={product !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("products.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("products.delete.description", {
              name: product?.name ?? "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage ? (
          <p role="alert" className="text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteProduct.isPending}>
            {t("products.delete.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteProduct.isPending}
            onClick={handleConfirm}
          >
            {deleteProduct.isPending
              ? t("products.delete.deleting")
              : t("products.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
