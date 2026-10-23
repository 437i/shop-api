import { useMutation, useQueryClient } from "@tanstack/react-query"

import type {
  SupplierAddressFormValues,
  SupplierFormValues,
} from "@/pages/suppliers/supplierFormSchema"
import { ApiError, NetworkError, apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"
import { notifySuccess } from "@/shared/feedback/notifications"

type CreateSupplierRequest =
  components["schemas"]["internal_supplier.CreateRequest"]
type UpdateAddressRequest =
  components["schemas"]["internal_supplier.UpdateAddressRequest"]
type SupplierResponse = components["schemas"]["internal_supplier.Response"]

type TranslateFn = (key: string) => string

export const SUPPLIERS_QUERY_KEY = ["suppliers"]

export const SUPPLIER_QUERY_KEY = ["supplier"]

export function resolveSupplierMutationError(
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

    if (error.status === 404) {
      return error.responseMessage ?? translate("errors.supplierNotFound")
    }

    return error.responseMessage ?? translate("errors.server")
  }

  return translate("errors.server")
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: SupplierFormValues) =>
      apiClient.post<CreateSupplierRequest, SupplierResponse>("/suppliers", {
        name: values.name,
        phone_number: values.phone,
        address: {
          country: values.address.country,
          city: values.address.city,
          street: values.address.street,
        },
      }),
    onSuccess: () => {
      notifySuccess("feedback.supplierCreated")
      void queryClient.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY })
    },
  })
}

interface UpdateSupplierAddressInput {
  supplierId: string
  address: SupplierAddressFormValues
}

export function useUpdateSupplierAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ supplierId, address }: UpdateSupplierAddressInput) =>
      apiClient.patch<UpdateAddressRequest, void>(
        `/suppliers/${supplierId}/address`,
        {
          address: {
            country: address.country,
            city: address.city,
            street: address.street,
          },
        },
      ),
    onSuccess: () => {
      notifySuccess("feedback.supplierAddressUpdated")
      void queryClient.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEY })
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (supplierId: string) =>
      apiClient.delete<void>(`/suppliers/${supplierId}`),
    onSuccess: () => {
      notifySuccess("feedback.supplierDeleted")
      void queryClient.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEY })
    },
  })
}
