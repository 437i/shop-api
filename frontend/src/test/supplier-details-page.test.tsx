import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { RouterProvider, createMemoryRouter } from "react-router"
import { I18nextProvider } from "react-i18next"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { SupplierDetailsPage } from "@/pages/suppliers/SupplierDetailsPage"
import { supplierDetailsQueryKey } from "@/pages/suppliers/useSupplierDetails"
import { useDeleteSupplier } from "@/pages/suppliers/useSupplierMutations"
import {
  AUTH_TOKEN_STORAGE_KEY,
  setUnauthorizedHandler,
} from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

const SUPPLIER_ID = "1"
const SUPPLIER_NAME = "Liebherr"

const CARD: Record<string, unknown> = {
  id: SUPPLIER_ID,
  name: SUPPLIER_NAME,
  phone_number: "+78123456789",
  address: {
    country: "Germany",
    city: "Berlin",
    street: "Alexanderplatz 2",
  },
}

const CARD_URL = `/api/v1/suppliers/${SUPPLIER_ID}`

let fetchMock: Mock<typeof fetch>

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function methodOf(init?: RequestInit): string {
  return init?.method ?? "GET"
}

function urlOf(input: RequestInfo | URL): string {
  return String(input)
}

type ResponseFactory = () => Promise<Response>

const resolved = (response: Response): ResponseFactory => () =>
  Promise.resolve(response)

function stubGetResponses(handlers: {
  card?: ResponseFactory
  delete?: ResponseFactory
}): void {
  fetchMock.mockImplementation((input, init) => {
    const method = methodOf(init)
    const url = urlOf(input)

    if (method === "DELETE" && handlers.delete) {
      return handlers.delete()
    }

    if (method !== "GET") {
      return Promise.reject(new Error(`Unexpected ${method} request`))
    }

    if (url === CARD_URL && handlers.card) {
      return handlers.card()
    }

    return Promise.reject(new Error(`Unexpected request: ${url}`))
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
      mutations: {
        retry: false,
      },
    },
  })
}

function createHookWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </QueryClientProvider>
    )
  }
}

function renderCardPage(
  initialPath = `/suppliers/${SUPPLIER_ID}`,
  queryClient = createTestQueryClient(),
) {
  const router = createMemoryRouter(
    [
      { path: "/suppliers", element: <div>suppliers-list-marker</div> },
      { path: "/suppliers/:id", element: <SupplierDetailsPage /> },
      { path: "*", element: <div>page-not-found-marker</div> },
    ],
    { initialEntries: [initialPath] },
  )

  const view = render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { ...view, queryClient }
}

function cardGetCalls() {
  return fetchMock.mock.calls.filter(
    ([input, init]) => methodOf(init) === "GET" && urlOf(input) === CARD_URL,
  )
}

beforeEach(async () => {
  localStorage.clear()
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal("fetch", fetchMock)

  await act(async () => {
    await i18n.changeLanguage("en")
  })
})

afterEach(() => {
  setUnauthorizedHandler(null)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("SupplierDetailsPage data loading", () => {
  it("sends the card request with the Bearer token from localStorage", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "test-token")
    stubGetResponses({ card: resolved(jsonResponse(200, CARD)) })

    renderCardPage()

    expect((await screen.findAllByText(SUPPLIER_NAME)).length).toBeGreaterThan(
      0,
    )

    const [url, init] = fetchMock.mock.calls.find(
      ([input, init]) => methodOf(init) === "GET" && urlOf(input) === CARD_URL,
    )!
    expect(url).toBe(CARD_URL)
    expect(init?.method).toBe("GET")
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer test-token",
    })
  })

  it("shows the skeleton until the card request completes", async () => {
    let resolveCard: (response: Response) => void = () => undefined
    stubGetResponses({
      card: () =>
        new Promise<Response>((resolve) => {
          resolveCard = resolve
        }),
    })

    renderCardPage()

    expect(
      screen.getByRole("status", { name: "Loading the supplier..." }),
    ).toBeInTheDocument()
    expect(screen.queryAllByText(SUPPLIER_NAME)).toHaveLength(0)

    await act(async () => {
      resolveCard(jsonResponse(200, CARD))
    })

    expect(
      (await screen.findAllByText(SUPPLIER_NAME)).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("displays all card fields, the address block and only the back action", async () => {
    stubGetResponses({ card: resolved(jsonResponse(200, CARD)) })

    renderCardPage()

    expect(
      (await screen.findAllByText(SUPPLIER_NAME)).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("+78123456789")).toBeInTheDocument()
    expect(screen.getByText("Phone")).toBeInTheDocument()
    expect(screen.getByText("Address")).toBeInTheDocument()
    expect(screen.getByText("Germany")).toBeInTheDocument()
    expect(screen.getByText("Berlin")).toBeInTheDocument()
    expect(screen.getByText("Alexanderplatz 2")).toBeInTheDocument()

    const buttonLabels = screen
      .getAllByRole("button")
      .map(
        (button) =>
          button.getAttribute("aria-label") ?? button.textContent ?? "",
      )
    expect(buttonLabels).toEqual(["Back to suppliers"])
    expect(screen.queryByText(/Edit address/)).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("SupplierDetailsPage not-found state", () => {
  it("shows the missing-supplier state on a 404 response with the back action", async () => {
    stubGetResponses({
      card: resolved(jsonResponse(404, { message: "supplier not found" })),
    })

    renderCardPage()

    expect(await screen.findByText("Supplier not found")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Back to suppliers" }),
    ).toBeInTheDocument()
    expect(screen.queryAllByText(SUPPLIER_NAME)).toHaveLength(0)
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument()
  })

  it("shows the missing-supplier state after reopening the card following its deletion from the list", async () => {
    stubGetResponses({
      card: resolved(jsonResponse(404, { message: "supplier not found" })),
      delete: resolved(new Response(null, { status: 204 })),
    })

    const queryClient = createTestQueryClient()
    queryClient.setQueryData(
      supplierDetailsQueryKey(SUPPLIER_ID),
      CARD as unknown,
    )

    const firstView = renderCardPage(`/suppliers/${SUPPLIER_ID}`, queryClient)

    expect(
      (await screen.findAllByText(SUPPLIER_NAME)).length,
    ).toBeGreaterThan(0)
    expect(cardGetCalls()).toHaveLength(0)

    firstView.unmount()

    const { result } = renderHook(() => useDeleteSupplier(), {
      wrapper: createHookWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync(SUPPLIER_ID)
    })

    renderCardPage(`/suppliers/${SUPPLIER_ID}`, queryClient)

    expect(await screen.findByText("Supplier not found")).toBeInTheDocument()
    expect(cardGetCalls()).toHaveLength(1)
    expect(
      queryClient.getQueryState(supplierDetailsQueryKey(SUPPLIER_ID))?.status,
    ).toBe("success")
  })
})

describe("SupplierDetailsPage error state", () => {
  it.each([
    [400, { message: "invalid supplier id" }, "invalid supplier id"],
    [500, { message: "internal server error" }, "internal server error"],
    [500, { error: "boom" }, "Server error. Please try again later."],
    [
      503,
      { message: "auth service unavailable" },
      "Server error. Please try again later.",
    ],
    [503, { error: "anything" }, "Server error. Please try again later."],
  ] as const)(
    "shows the message for status %i with the retry action",
    async (status, body, expectedMessage) => {
      stubGetResponses({
        card: resolved(jsonResponse(status, body)),
      })

      renderCardPage()

      const alert = await screen.findByRole("alert")
      expect(alert).toHaveTextContent(expectedMessage)
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
      expect(screen.queryAllByText(SUPPLIER_NAME)).toHaveLength(0)
    },
  )

  it("shows the network error when the request fails without a response", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))

    renderCardPage()

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Network error. Please try again.")
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
  })

  it("retries the card request and shows the card when the retry succeeds", async () => {
    let cardGetCount = 0
    stubGetResponses({
      card: () => {
        cardGetCount += 1

        return Promise.resolve(
          cardGetCount === 1
            ? jsonResponse(500, { error: "internal error" })
            : jsonResponse(200, CARD),
        )
      },
    })

    const user = userEvent.setup()
    renderCardPage()

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Server error. Please try again later.")

    await user.click(screen.getByRole("button", { name: "Retry" }))

    expect(
      (await screen.findAllByText(SUPPLIER_NAME)).length,
    ).toBeGreaterThan(0)
    expect(cardGetCalls()).toHaveLength(2)
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument()
  })

  it("shows no message for a 401 response and ends the session", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "token")
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    stubGetResponses({
      card: resolved(
        jsonResponse(401, { message: "invalid or expired token" }),
      ),
    })

    renderCardPage()

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1))

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Supplier not found")).not.toBeInTheDocument()
  })
})

describe("SupplierDetailsPage caching", () => {
  it("does not send a new card request when the card is reopened within the staleTime", async () => {
    stubGetResponses({
      card: resolved(jsonResponse(200, CARD)),
    })

    const queryClient = createTestQueryClient()

    const firstView = renderCardPage(`/suppliers/${SUPPLIER_ID}`, queryClient)
    expect(
      (await screen.findAllByText(SUPPLIER_NAME)).length,
    ).toBeGreaterThan(0)
    firstView.unmount()

    renderCardPage(`/suppliers/${SUPPLIER_ID}`, queryClient)
    expect(
      (await screen.findAllByText(SUPPLIER_NAME)).length,
    ).toBeGreaterThan(0)

    expect(cardGetCalls()).toHaveLength(1)
  })
})

describe("SupplierDetailsPage navigation and actions", () => {
  it("returns to the suppliers list from the card", async () => {
    stubGetResponses({
      card: resolved(jsonResponse(200, CARD)),
    })

    const user = userEvent.setup()
    renderCardPage()

    await user.click(
      await screen.findByRole("button", { name: "Back to suppliers" }),
    )

    expect(await screen.findByText("suppliers-list-marker")).toBeInTheDocument()
  })
})
