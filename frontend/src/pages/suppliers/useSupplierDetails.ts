import { useQuery } from "@tanstack/react-query"

import { ApiError, apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"

type SupplierDetailsResponse =
  components["schemas"]["internal_supplier.Response"]

export function supplierDetailsQueryKey(
  supplierId: string,
): readonly [string, string] {
  return ["supplier", supplierId] as const
}

export async function getSupplier(
  supplierId: string,
): Promise<SupplierDetailsResponse | null> {
  try {
    return await apiClient.get<SupplierDetailsResponse>(
      `/suppliers/${supplierId}`,
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }

    throw error
  }
}

export interface SupplierDetailsQuery {
  supplier: SupplierDetailsResponse | null
  isLoading: boolean
  error: Error | null
  isFetching: boolean
  refetch: () => void
}

export function useSupplierDetails(supplierId: string): SupplierDetailsQuery {
  const supplierQuery = useQuery({
    queryKey: supplierDetailsQueryKey(supplierId),
    queryFn: () => getSupplier(supplierId),
  })

  return {
    supplier: supplierQuery.data ?? null,
    isLoading: supplierQuery.isPending,
    error: supplierQuery.error,
    isFetching: supplierQuery.isFetching,
    refetch: () => {
      void supplierQuery.refetch()
    },
  }
}
