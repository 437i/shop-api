import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nextProvider } from "react-i18next"
import { RouterProvider, createMemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { routes } from "@/app/router"
import {
  AUTH_TOKEN_STORAGE_KEY,
  setUnauthorizedHandler,
} from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

const FIRST_TOKEN = "opaque-token-first"
const SECOND_TOKEN = "opaque-token-second"

const SECTION_HREFS = ["/clients", "/products", "/suppliers"]

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

function stubJsonResponses(status: number, body: unknown): void {
  fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(status, body)))
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: false,
      },
    },
  })
}

function renderApp(path: string, queryClient = createTestQueryClient()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })

  const view = render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { ...view, router, queryClient }
}

function collectNavigationSections(container: HTMLElement): string[] {
  return within(container)
    .getAllByRole("link")
    .map((link) => link.getAttribute("href") ?? "")
    .filter((href) => SECTION_HREFS.includes(href))
    .sort()
}

async function collectRowActions(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement,
): Promise<string[]> {
  const trigger = await within(container).findByRole("button", {
    name: "Actions for Liebherr CNel 4313",
  })

  await user.click(trigger)

  const items = await screen.findAllByRole("menuitem")
  const names = items.map(
    (item) => item.getAttribute("aria-label") ?? item.textContent?.trim() ?? "",
  )

  await user.keyboard("{Escape}")

  return names.sort()
}

describe("admin access model", () => {
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

  it("opens the protected section by the stored token and ends the session on the server response", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, FIRST_TOKEN)
    const handleUnauthorized = vi.fn()
    setUnauthorizedHandler(handleUnauthorized)

    let respondWithUnauthorized: ((response: Response) => void) | undefined
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          respondWithUnauthorized = resolve
        }),
    )

    renderApp("/products")

    expect(
      await screen.findByRole("heading", { name: "Products" }),
    ).toBeInTheDocument()

    await act(async () => {
      respondWithUnauthorized?.(
        jsonResponse(401, { error: "invalid or expired token" }),
      )
    })

    await waitFor(() => expect(handleUnauthorized).toHaveBeenCalled())
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it("renders the same navigation sections and row actions for different stored tokens", async () => {
    const user = userEvent.setup()
    stubJsonResponses(200, PRODUCTS)

    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, FIRST_TOKEN)
    const first = renderApp("/products")
    const firstSections = collectNavigationSections(first.container)
    const firstActions = await collectRowActions(user, first.container)
    first.unmount()

    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, SECOND_TOKEN)
    const second = renderApp("/products")
    const secondSections = collectNavigationSections(second.container)
    const secondActions = await collectRowActions(user, second.container)

    expect(firstSections).toEqual(SECTION_HREFS)
    expect(secondSections).toEqual(SECTION_HREFS)
    expect(firstActions).toEqual([
      "Decrease stock",
      "Delete product Liebherr CNel 4313",
      "Manage the photo of Liebherr CNel 4313",
    ])
    expect(firstActions).toEqual(secondActions)
  })

  it("does not request role, permission or profile data from the API", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, FIRST_TOKEN)
    stubJsonResponse(200, PRODUCTS)

    renderApp("/products")

    expect(await screen.findByRole("table")).toBeInTheDocument()

    const calls = fetchMock.mock.calls
    expect(calls.length).toBeGreaterThan(0)

    for (const [input, init] of calls) {
      const url = new URL(String(input), "http://localhost")

      expect(url.pathname).not.toMatch(
        /\/(me|profile|roles|permissions|rights)\b/i,
      )

      const queryKeys: string[] = []
      url.searchParams.forEach((_value, key) => queryKeys.push(key))

      for (const key of queryKeys) {
        expect(key.toLowerCase()).not.toMatch(
          /^(role|roles|permission|permissions|rights|profile)$/,
        )
      }

      const headers = (init as RequestInit | undefined)?.headers as
        | Record<string, string>
        | undefined
      expect(headers?.Authorization).toBe(`Bearer ${FIRST_TOKEN}`)
    }
  })
})
