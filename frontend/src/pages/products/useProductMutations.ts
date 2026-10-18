import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { ProductFormValues } from "@/pages/products/productFormSchema"
import { ApiError, NetworkError, apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"

type CreateProductRequest =
  components["schemas"]["internal_product.CreateRequest"]
type CreateProductResponse =
  components["schemas"]["internal_product.CreateResponse"]
type DecreaseStockRequest =
  components["schemas"]["internal_product.DecreaseStockRequest"]

type TranslateFn = (key: string) => string

export const PRODUCTS_QUERY_KEY = ["products"]

export function resolveProductMutationError(
  error: unknown,
  translate: TranslateFn,
  notFoundKey = "errors.productNotFound",
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

    if (error.status === 404) {
      return error.responseMessage ?? translate(notFoundKey)
    }

    if (error.status === 409) {
      return error.responseMessage ?? translate("errors.insufficientStock")
    }

    return error.responseMessage ?? translate("errors.server")
  }

  return translate("errors.server")
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: ProductFormValues) =>
      apiClient.post<CreateProductRequest, CreateProductResponse>("/products", {
        name: values.name,
        category: { name: values.category },
        price: values.price,
        available_stock: Number(values.stock),
        supplier_id: values.supplierId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (productId: string) =>
      apiClient.delete<void>(`/products/${productId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })
    },
  })
}

export interface DecreaseStockInput {
  productId: string
  amount: string
}

export function useDecreaseStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, amount }: DecreaseStockInput) =>
      apiClient.patch<DecreaseStockRequest, void>(
        `/products/${productId}/stock`,
        { amount: Number(amount) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })
    },
  })
}
