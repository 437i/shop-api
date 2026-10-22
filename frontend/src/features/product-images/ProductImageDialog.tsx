import { useEffect, useRef, useState } from "react"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validateImageFile } from "@/features/product-images/imageFileRules"
import {
  resolveProductImageError,
  useCurrentProductImageId,
  useDeleteProductImage,
  useProductImage,
  useReplaceProductImage,
  useUploadProductImage,
} from "@/features/product-images/useProductImage"

interface ProductImageDialogProps {
  productId: string | null
  productName: string
  onOpenChange: (open: boolean) => void
}

export function ProductImageDialog({
  productId,
  productName,
  onOpenChange,
}: ProductImageDialogProps) {
  const { t } = useTranslation()
  const open = productId !== null
  const [file, setFile] = useState<File | null>(null)
  const [validationKey, setValidationKey] = useState<string | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const { image, isLoading, errorMessage } = useProductImage(productId, open)
  const currentImageId = useCurrentProductImageId(productId)
  const upload = useUploadProductImage()
  const replace = useReplaceProductImage(productId)
  const remove = useDeleteProductImage(productId)

  useEffect(() => {
    const element = imageRef.current

    if (!image || !element) {
      return
    }

    const url = URL.createObjectURL(image)
    element.src = url

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [image])

  const isBusy = upload.isPending || replace.isPending || remove.isPending

  const mutationError = [upload, replace, remove]
    .map((mutation) => mutation.error)
    .find((error) => error !== null && error !== undefined)

  const actionError = mutationError
    ? resolveProductImageError(mutationError, t)
    : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (isBusy) {
      return
    }

    onOpenChange(nextOpen)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
    setValidationKey(null)
  }

  const requireFile = (): File | null => {
    const message = validateImageFile(file)

    if (message) {
      setValidationKey(message)
      return null
    }

    setValidationKey(null)
    return file
  }

  const handleUpload = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!productId || currentImageId || isBusy) {
      return
    }

    const selected = requireFile()

    if (!selected) {
      return
    }

    replace.reset()
    remove.reset()
    upload.mutate({ productId, file: selected })
  }

  const handleReplace = () => {
    if (!productId || isBusy) {
      return
    }

    const selected = requireFile()

    if (!selected) {
      return
    }

    upload.reset()
    remove.reset()
    replace.mutate(selected)
  }

  const handleDelete = () => {
    if (isBusy) {
      return
    }

    upload.reset()
    replace.reset()
    remove.mutate(undefined, {
      onSettled: () => {
        setIsDeleteOpen(false)
      },
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("productImages.title")}</DialogTitle>
            <DialogDescription>
              {t("productImages.description", { name: productName })}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <p className="text-xs text-muted-foreground">
              {t("productImages.loading")}
            </p>
          ) : null}

          {image ? (
            <img
              ref={imageRef}
              alt={t("productImages.imageAlt", { name: productName })}
              className="max-h-48 w-full rounded-md border object-contain"
            />
          ) : null}

          {!isLoading && !image && !errorMessage ? (
            <p className="text-xs text-muted-foreground">
              {t("productImages.empty")}
            </p>
          ) : null}

          {errorMessage ? (
            <p role="alert" className="text-xs text-destructive">
              {errorMessage}
            </p>
          ) : null}

          {actionError ? (
            <p role="alert" className="text-xs text-destructive">
              {actionError}
            </p>
          ) : null}

          <form className="grid gap-2" onSubmit={handleUpload} noValidate>
            <Label htmlFor="product-image-file">
              {t("productImages.fileLabel")}
            </Label>
            <Input
              id="product-image-file"
              type="file"
              accept="image/*"
              disabled={isBusy}
              aria-invalid={validationKey ? true : undefined}
              aria-describedby={
                validationKey ? "product-image-file-error" : undefined
              }
              onChange={handleFileChange}
            />
            {validationKey ? (
              <p
                id="product-image-file-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {t(validationKey)}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => handleOpenChange(false)}
              >
                {t("productImages.cancel")}
              </Button>
              {currentImageId ? null : (
                <Button type="submit" disabled={isBusy}>
                  {upload.isPending
                    ? t("productImages.uploading")
                    : t("productImages.upload")}
                </Button>
              )}
            </DialogFooter>
          </form>

          {currentImageId ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={handleReplace}
              >
                {replace.isPending
                  ? t("productImages.replacing")
                  : t("productImages.replace")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isBusy}
                onClick={() => setIsDeleteOpen(true)}
              >
                {t("productImages.delete")}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("productImages.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("productImages.deleteDescription", { name: productName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              {t("productImages.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              aria-label={t("productImages.deleteNamed", { name: productName })}
              onClick={handleDelete}
            >
              {remove.isPending
                ? t("productImages.deleting")
                : t("productImages.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
