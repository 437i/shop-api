import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { ProductsListPage } from "@/pages/products/ProductsListPage"
import {
  AUTH_TOKEN_STORAGE_KEY,
  setUnauthorizedHandler,
} from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

const TOKEN = "test-token"

const STALE_TIME_MS = 5 * 60 * 1000

type ProductFixture = {
  id: string
  name: string
  category?: { id: string; name: string }
  price?: string
  available_stock?: number
}

const PRODUCTS: ProductFixture[] = [
  {
    id: "1",
    name: "Liebherr CNel 4313",
    category: { id: "c1", name: "Refrigerators" },
    price: "999.99",
    available_stock: 5,
  },
  {
    id: "2",
    name: "Bosch Serie 6",
    category: { id: "c2", name: "Dishwashers" },
    price: "749.00",
    available_stock: 12,
  },
]

let fetchMock: Mock<typeof fetch>

function stubJsonResponse(status: number, body: unknown): void {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  )
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: true,
        retry: false,
      },
    },
  })
}

function renderPage(queryClient = createTestQueryClient()) {
  const view = render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ProductsListPage />
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { ...view, queryClient }
}

describe("ProductsListPage", () => {
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
    vi.unstubAllGlobals()
  })

  it("shows a five-row skeleton with four columns instead of the table while loading", () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}))
    renderPage()

    const status = screen.getByRole("status", { name: "Loading products..." })

    expect(status.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(20)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("shows the empty state with an icon when the API returns an empty list", async () => {
    stubJsonResponse(200, [])
    renderPage()

    const emptyMessage = await screen.findByText("No products in stock")
    const emptyState = emptyMessage.closest("div")

    expect(emptyState?.querySelector("svg")).not.toBeNull()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("requests the products with the Bearer token and renders the table", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    stubJsonResponse(200, PRODUCTS)
    renderPage()

    expect(await screen.findByRole("table")).toBeInTheDocument()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("/api/v1/products")
    expect(init).toMatchObject({ method: "GET" })
    expect(init?.headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
    })

    expect(
      screen.getByRole("heading", { name: "Products" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Category" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Price" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Available Stock" }),
    ).toBeInTheDocument()

    const rows = within(screen.getByRole("table")).getAllByRole("row")
    expect(rows).toHaveLength(3)

    const firstRowCells = within(rows[1]!)
      .getAllByRole("cell")
      .map((cell) => cell.textContent)
    expect(firstRowCells).toEqual([
      "Liebherr CNel 4313",
      "Refrigerators",
      "999.99",
      "5",
    ])

    const secondRowCells = within(rows[2]!)
      .getAllByRole("cell")
      .map((cell) => cell.textContent)
    expect(secondRowCells).toEqual([
      "Bosch Serie 6",
      "Dishwashers",
      "749.00",
      "12",
    ])
  })

  it("renders empty cells when category and optional fields are missing", async () => {
    stubJsonResponse(200, [{ id: "3", name: "Unknown product" }])
    renderPage()

    expect(await screen.findByRole("table")).toBeInTheDocument()

    const rows = within(screen.getByRole("table")).getAllByRole("row")
    const cells = within(rows[1]!)
      .getAllByRole("cell")
      .map((cell) => cell.textContent)
    expect(cells).toEqual(["Unknown product", "", "", ""])
  })

  it.each([
    [500, { message: "database is down" }, "database is down"],
    [500, { error: "internal error" }, "Server error. Please try again later."],
    [
      503,
      { error: "auth service unavailable" },
      "Server error. Please try again later.",
    ],
  ] as const)(
    "shows an alert for status %i without the table",
    async (status, body, expectedMessage) => {
      stubJsonResponse(status, body)
      renderPage()

      expect(await screen.findByRole("alert")).toHaveTextContent(
        expectedMessage,
      )
      expect(screen.queryByRole("table")).not.toBeInTheDocument()
    },
  )

  it("shows a network error alert when the request fails without a response", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    renderPage()

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    )
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("clears the session and triggers the redirect handler on 401", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(["cached-products"], [{ id: "cached" }])
    const handleUnauthorized = vi.fn(() => {
      queryClient.clear()
    })
    setUnauthorizedHandler(handleUnauthorized)

    stubJsonResponse(401, { error: "invalid or expired token" })
    renderPage(queryClient)

    await waitFor(() => expect(handleUnauthorized).toHaveBeenCalledTimes(1))
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(queryClient.getQueryData(["cached-products"])).toBeUndefined()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("serves cached data without a new request when remounted within staleTime", async () => {
    stubJsonResponse(200, PRODUCTS)
    const queryClient = createTestQueryClient()

    const firstMount = renderPage(queryClient)
    expect(await screen.findByText("Liebherr CNel 4313")).toBeInTheDocument()
    firstMount.unmount()

    renderPage(queryClient)

    expect(screen.getByText("Liebherr CNel 4313")).toBeInTheDocument()
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      3,
    )
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("starts a background refetch on tab focus when cached data became stale", async () => {
    stubJsonResponse(200, PRODUCTS)
    const { queryClient } = renderPage()

    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    act(() => {
      queryClient.setQueryData(["products"], PRODUCTS, {
        updatedAt: Date.now() - STALE_TIME_MS - 60_000,
      })
    })

    fetchMock.mockImplementationOnce(() => new Promise<Response>(() => {}))

    await act(async () => {
      window.dispatchEvent(new Event("visibilitychange"))
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.getByText("Liebherr CNel 4313")).toBeInTheDocument()
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      3,
    )
  })

  it("does not refetch on tab focus while cached data is fresh", async () => {
    stubJsonResponse(200, PRODUCTS)
    renderPage()

    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(new Event("visibilitychange"))
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Liebherr CNel 4313")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("renders the page and table headers in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubJsonResponse(200, PRODUCTS)
    renderPage()

    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Товары" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Название" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Категория" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Цена" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Доступный остаток" }),
    ).toBeInTheDocument()
  })

  it("renders the empty state in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubJsonResponse(200, [])
    renderPage()

    expect(
      await screen.findByText("Нет товаров в наличии"),
    ).toBeInTheDocument()
  })

  it("renders the server error message in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubJsonResponse(500, { error: "internal error" })
    renderPage()

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ошибка сервера. Попробуйте позже.",
    )
  })
})
