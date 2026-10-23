import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

interface ProductImageProps {
  image: Blob | null
  productName: string
  isLoading?: boolean
  errorMessage?: string | null
  className?: string
}

const DEFAULT_IMAGE_CLASS = "max-h-48 w-full rounded-md border object-contain"

export function ProductImage({
  image,
  productName,
  isLoading = false,
  errorMessage = null,
  className = DEFAULT_IMAGE_CLASS,
}: ProductImageProps) {
  const { t } = useTranslation()
  const imageRef = useRef<HTMLImageElement | null>(null)

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

  if (isLoading || errorMessage) {
    return null
  }

  if (!image) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("productImages.empty")}
      </p>
    )
  }

  return (
    <img
      ref={imageRef}
      alt={t("productImages.imageAlt", { name: productName })}
      className={className}
    />
  )
}
