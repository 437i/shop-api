import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nextProvider } from "react-i18next"
import {
  MemoryRouter,
  Route,
  Routes,
  useParams,
} from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { SuppliersListPage } from "@/pages/suppliers/SuppliersListPage"
import {
  AUTH_TOKEN_STORAGE_KEY,
  setUnauthorizedHandler,
} from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

const TOKEN = "test-token"

type SupplierFixture = {
  id: string
  name: string
  phone_number: string
  address: {
    id: string
    country: string
    city: string
    street: string
  }
}

const SUPPLIERS: SupplierFixture[] = [
  {
    id: "1",
    name: "ООО Моя Оборона",
    phone_number: "+79991234567",
    address: {
      id: "a1",
      country: "Russia",
      city: "Moscow",
      street: "Tverskaya 1",
    },
  },
  {
    id: "2",
    name: "Liebherr",
    phone_number: "+78123456789",
    address: {
      id: "a2",
      country: "Germany",
      city: "Berlin",
      street: "Alexanderplatz 2",
    },
  },
]

let fetchMock: Mock<typeof fetch>

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function stubJsonResponse(status: number, body: unknown): void {
  fetchMock.mockResolvedValue(jsonResponse(status, body))
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

function SupplierCardMarker() {
  const { id } = useParams()

  return <div>supplier-card-{id}</div>
}

function renderPage(queryClient = createTestQueryClient()) {
  const view = render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={["/suppliers"]}>
          <Routes>
            <Route path="/suppliers" element={<SuppliersListPage />} />
            <Route path="/suppliers/:id" element={<SupplierCardMarker />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { ...view, queryClient }
}

describe("SuppliersListPage", () => {
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

  it("shows a five-row skeleton instead of the table while loading", () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}))
    renderPage()

    const status = screen.getByRole("status", { name: "Loading suppliers..." })

    expect(status.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(25)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("shows the empty state when the API returns an empty list", async () => {
    stubJsonResponse(200, [])
    renderPage()

    expect(await screen.findByText("No suppliers found")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("requests the suppliers with the Bearer token and renders the table", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    stubJsonResponse(200, SUPPLIERS)
    renderPage()

    expect(await screen.findByRole("table")).toBeInTheDocument()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("/api/v1/suppliers")
    expect(init).toMatchObject({ method: "GET" })
    expect(init?.headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
    })

    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Phone" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Country" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "City" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Street" }),
    ).toBeInTheDocument()

    const rows = within(screen.getByRole("table")).getAllByRole("row")
    expect(rows).toHaveLength(3)

    const firstRowCells = within(rows[1]!)
      .getAllByRole("cell")
      .map((cell) => cell.textContent)
    expect(firstRowCells).toEqual([
      "ООО Моя Оборона",
      "+79991234567",
      "Russia",
      "Moscow",
      "Tverskaya 1",
    ])

    const secondRowCells = within(rows[2]!)
      .getAllByRole("cell")
      .map((cell) => cell.textContent)
    expect(secondRowCells).toEqual([
      "Liebherr",
      "+78123456789",
      "Germany",
      "Berlin",
      "Alexanderplatz 2",
    ])
  })

  it("shows the details action as the first item in the row actions menu of every supplier", async () => {
    const user = userEvent.setup()
    stubJsonResponse(200, SUPPLIERS)
    renderPage()

    const table = await screen.findByRole("table")

    await user.click(
      within(table).getByRole("button", {
        name: "Actions for ООО Моя Оборона",
      }),
    )
    let items = await screen.findAllByRole("menuitem")
    expect(items[0]).toHaveTextContent("Details")

    await user.keyboard("{Escape}")

    await user.click(
      await screen.findByRole("button", { name: "Actions for Liebherr" }),
    )
    items = await screen.findAllByRole("menuitem")
    expect(items[0]).toHaveTextContent("Details")
  })

  it("opens the supplier card of the row supplier when details is activated", async () => {
    const user = userEvent.setup()
    stubJsonResponse(200, SUPPLIERS)
    renderPage()

    await user.click(
      await screen.findByRole("button", { name: "Actions for Liebherr" }),
    )
    await user.click(
      await screen.findByRole("menuitem", { name: "Details" }),
    )

    expect(await screen.findByText("supplier-card-2")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
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

  it("offers a retry action when the list request fails", async () => {
    stubJsonResponse(500, { message: "server error" })
    renderPage()

    expect(
      await screen.findByRole("button", { name: "Retry" }),
    ).toBeInTheDocument()
  })

  it("repeats the list request when the retry action is activated", async () => {
    let getCalls = 0
    fetchMock.mockImplementation(() => {
      getCalls += 1

      return Promise.resolve(
        getCalls === 1
          ? jsonResponse(500, { message: "server error" })
          : jsonResponse(200, SUPPLIERS),
      )
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument()
    expect(getCalls).toBe(2)
  })

  it("keeps the retry action available after an unsuccessful retry", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(500, { message: "server error" })),
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole("button", { name: "Retry" }))

    expect(await screen.findByRole("button", { name: "Retry" })).toBeEnabled()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("keeps the error message and the blocked retry action while the repeated request runs", async () => {
    let getCalls = 0
    let resolveRetry: ((response: Response) => void) | undefined

    fetchMock.mockImplementation((_input, init) => {
      const method = init?.method ?? "GET"

      if (method !== "GET") {
        return Promise.reject(new Error(`Unexpected ${method} request`))
      }

      getCalls += 1

      if (getCalls === 1) {
        return Promise.resolve(jsonResponse(500, { message: "server error" }))
      }

      return new Promise<Response>((resolve) => {
        resolveRetry = resolve
      })
    })

    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole("button", { name: /^Retry$/ }),
    )

    const retrying = await screen.findByRole("button", {
      name: /^Retrying$/,
    })
    expect(retrying).toBeDisabled()
    expect(screen.getByRole("alert")).toBeVisible()
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0)

    await act(async () => {
      resolveRetry?.(jsonResponse(200, SUPPLIERS))
    })

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
    expect(screen.getByRole("table")).toBeInTheDocument()
  })

  it("clears the session and triggers the redirect handler on 401", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(["cached-suppliers"], [{ id: "cached" }])
    const handleUnauthorized = vi.fn(() => {
      queryClient.clear()
    })
    setUnauthorizedHandler(handleUnauthorized)

    stubJsonResponse(401, { error: "invalid or expired token" })
    renderPage(queryClient)

    await waitFor(() => expect(handleUnauthorized).toHaveBeenCalledTimes(1))
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(queryClient.getQueryData(["cached-suppliers"])).toBeUndefined()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("renders the page and table headers in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubJsonResponse(200, SUPPLIERS)
    renderPage()

    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Поставщики" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Добавить поставщика" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Имя" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Телефон" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Страна" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Город" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Улица" }),
    ).toBeInTheDocument()
  })

  it("renders the empty state in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubJsonResponse(200, [])
    renderPage()

    expect(
      await screen.findByText("Поставщики не найдены"),
    ).toBeInTheDocument()
  })
})
