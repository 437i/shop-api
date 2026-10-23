import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import {
  getSupplier,
  supplierDetailsQueryKey,
  useSupplierDetails,
} from "@/pages/suppliers/useSupplierDetails"
import {
  AUTH_TOKEN_STORAGE_KEY,
  ApiError,
  NetworkError,
} from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

const SUPPLIER_ID = "1"

const SUPPLIER: Record<string, unknown> = {
  id: SUPPLIER_ID,
  name: "Liebherr",
  phone_number: "+78123456789",
  address: {
    country: "Germany",
    city: "Berlin",
    street: "Alexanderplatz 2",
  },
}

let fetchMock: Mock<typeof fetch>

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: true,
        retry: false,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </QueryClientProvider>
    )
  }
}

describe("useSupplierDetails", () => {
  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("requests the supplier details with the Bearer token from localStorage", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "test-token")
    fetchMock.mockResolvedValue(jsonResponse(200, SUPPLIER))

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useSupplierDetails(SUPPLIER_ID), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("/api/v1/suppliers/1")
    expect(init?.method).toBe("GET")
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer test-token",
    })
  })

  it("caches the response under the key [\"supplier\", id]", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, SUPPLIER))
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useSupplierDetails(SUPPLIER_ID), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.supplier).not.toBeNull())

    expect(result.current.supplier).toEqual(SUPPLIER)
    expect(
      queryClient.getQueryData(["supplier", SUPPLIER_ID]),
    ).toEqual(SUPPLIER)
    expect(
      queryClient.getQueryState(supplierDetailsQueryKey(SUPPLIER_ID))?.status,
    ).toBe("success")
  })

  it("returns null data without an error state when the supplier is not found", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, { message: "supplier not found" }),
    )
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useSupplierDetails(SUPPLIER_ID), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.supplier).toBeNull()
    expect(result.current.error).toBeNull()
    expect(
      queryClient.getQueryState(supplierDetailsQueryKey(SUPPLIER_ID))?.status,
    ).toBe("success")
  })

  it.each([
    [400, { message: "invalid supplier id" }],
    [500, { error: "internal error" }],
  ])("reports an error state for a %i response", async (status, body) => {
    fetchMock.mockResolvedValue(jsonResponse(status, body))
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useSupplierDetails(SUPPLIER_ID), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() =>
      expect(
        queryClient.getQueryState(supplierDetailsQueryKey(SUPPLIER_ID))
          ?.status,
      ).toBe("error"),
    )

    expect(result.current.error).toBeInstanceOf(ApiError)
    expect((result.current.error as ApiError).status).toBe(status)
    expect(result.current.supplier).toBeNull()
  })

  it("reports an error state when the request fails without a response", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useSupplierDetails(SUPPLIER_ID), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() =>
      expect(
        queryClient.getQueryState(supplierDetailsQueryKey(SUPPLIER_ID))
          ?.status,
      ).toBe("error"),
    )

    expect(result.current.error).toBeInstanceOf(NetworkError)
    expect(result.current.supplier).toBeNull()
  })

  it("returns null for a 404 response from getSupplier directly", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, { message: "supplier not found" }),
    )

    await expect(getSupplier(SUPPLIER_ID)).resolves.toBeNull()
  })

  it("rethrows other errors from getSupplier directly", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: "internal error" }))

    await expect(getSupplier(SUPPLIER_ID)).rejects.toBeInstanceOf(ApiError)
  })
})
