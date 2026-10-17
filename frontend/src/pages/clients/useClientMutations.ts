import { useMutation, useQueryClient } from "@tanstack/react-query"

import type {
  ClientAddressFormValues,
  ClientFormValues,
} from "@/pages/clients/clientFormSchema"
import { ApiError, NetworkError, apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/generated/schema"

type CreateClientRequest = components["schemas"]["internal_client.CreateRequest"]
type UpdateAddressRequest =
  components["schemas"]["internal_client.UpdateAddressRequest"]
type ClientResponse = components["schemas"]["internal_client.Response"]

type TranslateFn = (key: string) => string

export const CLIENTS_QUERY_KEY = ["clients"]

export function resolveClientMutationError(
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
      return error.responseMessage ?? translate("errors.notFound")
    }

    return error.responseMessage ?? translate("errors.server")
  }

  return translate("errors.server")
}

export function useCreateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: ClientFormValues) =>
      apiClient.post<CreateClientRequest, ClientResponse>("/clients", {
        name: values.name,
        surname: values.surname,
        birthday: values.birthday,
        gender: values.gender,
        address: {
          country: values.address.country,
          city: values.address.city,
          street: values.address.street,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (clientId: string) =>
      apiClient.delete<void>(`/clients/${clientId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY })
    },
  })
}

interface UpdateClientAddressInput {
  clientId: string
  address: ClientAddressFormValues
}

export function useUpdateClientAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ clientId, address }: UpdateClientAddressInput) =>
      apiClient.patch<UpdateAddressRequest, void>(
        `/clients/${clientId}/address`,
        {
          address: {
            country: address.country,
            city: address.city,
            street: address.street,
          },
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY })
    },
  })
}
