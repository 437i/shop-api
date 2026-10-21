import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nextProvider } from "react-i18next"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { ClientsListPage } from "@/pages/clients/ClientsListPage"
import {
  AUTH_TOKEN_STORAGE_KEY,
  setUnauthorizedHandler,
} from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

const TOKEN = "test-token"

type ClientFixture = {
  id: string
  name: string
  surname: string
  birthday: string
  gender: string
  registration_date: string
}

const CLIENTS: ClientFixture[] = [
  {
    id: "1",
    name: "Ivan",
    surname: "Ivanov",
    birthday: "1986-09-12",
    gender: "m",
    registration_date: new Date(2026, 8, 12, 12, 0).toISOString(),
  },
  {
    id: "2",
    name: "Anna",
    surname: "Petrova",
    birthday: "1990-01-05",
    gender: "f",
    registration_date: new Date(2024, 0, 3, 9, 30).toISOString(),
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

function renderPage(queryClient = createTestQueryClient()) {
  const view = render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ClientsListPage />
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { ...view, queryClient }
}

describe("ClientsListPage", () => {
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

    const status = screen.getByRole("status", { name: "Loading clients..." })

    expect(status.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(25)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("shows the empty state when the API returns an empty list", async () => {
    stubJsonResponse(200, [])
    renderPage()

    expect(await screen.findByText("No clients found")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("requests the clients with the Bearer token and renders the table", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    stubJsonResponse(200, CLIENTS)
    renderPage()

    expect(await screen.findByRole("table")).toBeInTheDocument()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("/api/v1/clients")
    expect(init).toMatchObject({ method: "GET" })
    expect(init?.headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
    })

    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Surname" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Birthday" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Gender" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Registration Date" }),
    ).toBeInTheDocument()

    const rows = within(screen.getByRole("table")).getAllByRole("row")
    expect(rows).toHaveLength(3)

    const firstRowCells = within(rows[1]!)
      .getAllByRole("cell")
      .map((cell) => cell.textContent)
    expect(firstRowCells).toEqual([
      "Ivan",
      "Ivanov",
      "1986-09-12",
      "m",
      "2026-09-12 12:00",
    ])

    const secondRowCells = within(rows[2]!)
      .getAllByRole("cell")
      .map((cell) => cell.textContent)
    expect(secondRowCells).toEqual([
      "Anna",
      "Petrova",
      "1990-01-05",
      "f",
      "2024-01-03 09:30",
    ])
  })

  it.each([
    [400, { message: "invalid query params" }, "invalid query params"],
    [400, { error: "bad request" }, "Invalid request"],
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
          : jsonResponse(200, CLIENTS),
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
      resolveRetry?.(jsonResponse(200, CLIENTS))
    })

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
    expect(screen.getByRole("table")).toBeInTheDocument()
  })

  it("clears the session and triggers the redirect handler on 401", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(["cached-clients"], [{ id: "cached" }])
    const handleUnauthorized = vi.fn(() => {
      queryClient.clear()
    })
    setUnauthorizedHandler(handleUnauthorized)

    stubJsonResponse(401, { error: "invalid or expired token" })
    renderPage(queryClient)

    await waitFor(() => expect(handleUnauthorized).toHaveBeenCalledTimes(1))
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(queryClient.getQueryData(["cached-clients"])).toBeUndefined()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("serves cached data without a new request when remounted within staleTime", async () => {
    stubJsonResponse(200, CLIENTS)
    const queryClient = createTestQueryClient()

    const firstMount = renderPage(queryClient)
    expect(await screen.findByText("Ivan")).toBeInTheDocument()
    firstMount.unmount()

    renderPage(queryClient)

    expect(screen.getByText("Ivan")).toBeInTheDocument()
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      3,
    )
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("renders the table headers in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubJsonResponse(200, CLIENTS)
    renderPage()

    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Имя" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Фамилия" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Дата рождения" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Пол" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Дата регистрации" }),
    ).toBeInTheDocument()
  })

  it("renders the empty state in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubJsonResponse(200, [])
    renderPage()

    expect(await screen.findByText("Клиенты не найдены")).toBeInTheDocument()
  })
})
