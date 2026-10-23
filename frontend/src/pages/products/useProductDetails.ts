import { useQuery } from "@tanstack/react-query"

import { ApiError, apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"

type ProductDetailsResponse =
  components["schemas"]["internal_product.FullResponse"]

export function productDetailsQueryKey(
  productId: string,
): readonly [string, string] {
  return ["product", productId] as const
}

export async function getProduct(
  productId: string,
): Promise<ProductDetailsResponse | null> {
  try {
    return await apiClient.get<ProductDetailsResponse>(`/products/${productId}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }

    throw error
  }
}

export interface ProductDetailsQuery {
  product: ProductDetailsResponse | null
  isLoading: boolean
  error: Error | null
  isFetching: boolean
  refetch: () => void
}

export function useProductDetails(productId: string): ProductDetailsQuery {
  const productQuery = useQuery({
    queryKey: productDetailsQueryKey(productId),
    queryFn: () => getProduct(productId),
  })

  return {
    product: productQuery.data ?? null,
    isLoading: productQuery.isPending,
    error: productQuery.error,
    isFetching: productQuery.isFetching,
    refetch: () => {
      void productQuery.refetch()
    },
  }
}
