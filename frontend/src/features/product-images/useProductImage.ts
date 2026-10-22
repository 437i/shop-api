import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import {
  deleteProductImage,
  fetchProductImage,
  replaceProductImage,
  uploadProductImage,
} from "@/features/product-images/api"
import { PRODUCTS_QUERY_KEY } from "@/pages/products/useProductMutations"
import { ApiError, NetworkError, apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"
import { notifySuccess } from "@/shared/feedback/notifications"

type ProductListResponse = components["schemas"]["internal_product.ListResponse"]

type TranslateFn = (key: string) => string

export function productImageQueryKey(
  productId: string,
): readonly [string, string] {
  return ["product-image", productId] as const
}

export function resolveProductImageError(
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

    if (error.status === 404) {
      return error.responseMessage ?? translate("errors.imageNotFound")
    }

    if (error.status === 400) {
      return error.responseMessage ?? translate("errors.invalidRequest")
    }

    return error.responseMessage ?? translate("errors.server")
  }

  return translate("errors.server")
}

export interface ProductImageQuery {
  image: Blob | null
  isLoading: boolean
  errorMessage: string | null
}

export function useProductImage(
  productId: string | null,
  isOpen: boolean,
): ProductImageQuery {
  const { t } = useTranslation()

  const imageQuery = useQuery({
    queryKey: productImageQueryKey(productId ?? ""),
    queryFn: async () => {
      try {
        return await fetchProductImage(productId as string)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null
        }

        throw error
      }
    },
    enabled: isOpen && Boolean(productId),
    retry: false,
  })

  return {
    image: imageQuery.data ?? null,
    isLoading: isOpen && imageQuery.isPending,
    errorMessage: imageQuery.error
      ? resolveProductImageError(imageQuery.error, t)
      : null,
  }
}

export function useCurrentProductImageId(
  productId: string | null,
): string | null {
  const productsQuery = useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: () => apiClient.get<ProductListResponse[]>("/products"),
    enabled: Boolean(productId),
  })

  if (!productId) {
    return null
  }

  const product = (productsQuery.data ?? []).find(
    (entry) => entry.id === productId,
  )

  return product?.image_id ?? null
}

export interface UploadProductImageInput {
  productId: string
  file: Blob
}

export function useUploadProductImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, file }: UploadProductImageInput) =>
      uploadProductImage(productId, file),
    onSuccess: (_data, { productId }) => {
      notifySuccess("feedback.productImageUploaded")
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: productImageQueryKey(productId),
      })
    },
  })
}

export function useReplaceProductImage(productId: string | null) {
  const queryClient = useQueryClient()
  const imageId = useCurrentProductImageId(productId)

  return useMutation({
    mutationFn: (file: Blob) => {
      if (!imageId) {
        throw new ApiError(404)
      }

      return replaceProductImage(imageId, file)
    },
    onSuccess: () => {
      notifySuccess("feedback.productImageReplaced")
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })

      if (productId) {
        void queryClient.invalidateQueries({
          queryKey: productImageQueryKey(productId),
        })
      }
    },
  })
}

export function useDeleteProductImage(productId: string | null) {
  const queryClient = useQueryClient()
  const imageId = useCurrentProductImageId(productId)

  return useMutation({
    mutationFn: () => {
      if (!imageId) {
        throw new ApiError(404)
      }

      return deleteProductImage(imageId)
    },
    onSuccess: () => {
      notifySuccess("feedback.productImageDeleted")
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })

      if (productId) {
        void queryClient.invalidateQueries({
          queryKey: productImageQueryKey(productId),
        })
      }
    },
  })
}
