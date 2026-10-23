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

import { ProductDetailsPage } from "@/pages/products/ProductDetailsPage"
import { productDetailsQueryKey } from "@/pages/products/useProductDetails"
import { useDeleteProduct } from "@/pages/products/useProductMutations"
import {
  AUTH_TOKEN_STORAGE_KEY,
  setUnauthorizedHandler,
} from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

const PRODUCT_ID = "1"
const PRODUCT_NAME = "Liebherr CNel 4313"
const IMAGE_BYTES = "image-bytes"

const CARD: Record<string, unknown> = {
  id: PRODUCT_ID,
  name: PRODUCT_NAME,
  category: { id: "c1", name: "Refrigerators" },
  price: "999.99",
  available_stock: 5,
  last_update_date: "2026-09-12T12:00:00",
  image_id: "image-1",
  supplier: {
    id: "s1",
    name: "Liebherr",
    phone_number: "+78123456789",
    address: {
      country: "Germany",
      city: "Berlin",
      street: "Alexanderplatz 2",
    },
  },
}

const INVALID_DATE_CARD: Record<string, unknown> = {
  ...CARD,
  last_update_date: "not-a-date",
}

const CARD_URL = `/api/v1/products/${PRODUCT_ID}`
const IMAGE_URL = `/api/v1/products/${PRODUCT_ID}/image`
const LIST_URL = "/api/v1/products"

let fetchMock: Mock<typeof fetch>

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function binaryResponse(status: number, text: string): Response {
  return new Response(text, {
    status,
    headers: { "Content-Type": "application/octet-stream" },
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
  image?: ResponseFactory
  list?: ResponseFactory
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

    if (url === IMAGE_URL && handlers.image) {
      return handlers.image()
    }

    if (url === LIST_URL && handlers.list) {
      return handlers.list()
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
  initialPath = `/products/${PRODUCT_ID}`,
  queryClient = createTestQueryClient(),
) {
  const router = createMemoryRouter(
    [
      { path: "/products", element: <div>products-list-marker</div> },
      { path: "/products/:id", element: <ProductDetailsPage /> },
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

function deleteCalls() {
  return fetchMock.mock.calls.filter(([, init]) => methodOf(init) === "DELETE")
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

describe("ProductDetailsPage data loading", () => {
  it("sends the card request with the Bearer token from localStorage", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "test-token")
    stubGetResponses({ card: resolved(jsonResponse(200, CARD)) })

    renderCardPage()

    expect(await screen.findByText(PRODUCT_NAME)).toBeInTheDocument()

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
      image: resolved(jsonResponse(404, { message: "image not found" })),
    })

    renderCardPage()

    expect(
      screen.getByRole("status", { name: "Loading the product..." }),
    ).toBeInTheDocument()
    expect(screen.queryByText(PRODUCT_NAME)).not.toBeInTheDocument()

    await act(async () => {
      resolveCard(jsonResponse(200, CARD))
    })

    expect(await screen.findByText(PRODUCT_NAME)).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("displays all card fields, the supplier block and only the supported actions", async () => {
    stubGetResponses({ card: resolved(jsonResponse(200, CARD)) })

    renderCardPage()

    expect(await screen.findByText("2026-09-12 12:00")).toBeInTheDocument()
    expect(screen.getByText(PRODUCT_NAME)).toBeInTheDocument()
    expect(screen.getByText("Category")).toBeInTheDocument()
    expect(screen.getByText("Refrigerators")).toBeInTheDocument()
    expect(screen.getByText("Price")).toBeInTheDocument()
    expect(screen.getByText("999.99")).toBeInTheDocument()
    expect(screen.getByText("Available Stock")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("Last Update")).toBeInTheDocument()
    expect(screen.getByText("Supplier")).toBeInTheDocument()
    expect(screen.getByText("Liebherr")).toBeInTheDocument()
    expect(screen.getByText("+78123456789")).toBeInTheDocument()
    expect(screen.getByText("Germany")).toBeInTheDocument()
    expect(screen.getByText("Berlin")).toBeInTheDocument()
    expect(screen.getByText("Alexanderplatz 2")).toBeInTheDocument()

    const buttonLabels = screen
      .getAllByRole("button")
      .map(
        (button) =>
          button.getAttribute("aria-label") ?? button.textContent ?? "",
      )
    expect(buttonLabels).toEqual([
      "Manage the photo of Liebherr CNel 4313",
      "Back to products",
    ])
  })

  it("shows the raw value when the last update date is invalid", async () => {
    stubGetResponses({ card: resolved(jsonResponse(200, INVALID_DATE_CARD)) })

    renderCardPage()

    expect(await screen.findByText("not-a-date")).toBeInTheDocument()
  })
})

describe("ProductDetailsPage photo area", () => {
  it("shows the photo loading state while the image is requested", async () => {
    let resolveImage: (response: Response) => void = () => undefined
    stubGetResponses({
      card: resolved(jsonResponse(200, CARD)),
      image: () =>
        new Promise<Response>((resolve) => {
          resolveImage = resolve
        }),
    })

    renderCardPage()

    await screen.findByText(PRODUCT_NAME)
    expect(await screen.findByText("Loading the photo...")).toBeInTheDocument()

    await act(async () => {
      resolveImage(binaryResponse(200, IMAGE_BYTES))
    })

    expect(
      await screen.findByRole("img", {
        name: `Photo of the product ${PRODUCT_NAME}`,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Loading the photo...")).not.toBeInTheDocument()
  })

  it("shows the missing-photo state when the image returns 404", async () => {
    stubGetResponses({
      card: resolved(jsonResponse(200, CARD)),
      image: resolved(jsonResponse(404, { message: "image not found" })),
    })

    renderCardPage()

    await screen.findByText(PRODUCT_NAME)

    expect(await screen.findByText("The product has no photo")).toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows the server message in the photo area when the image request fails", async () => {
    stubGetResponses({
      card: resolved(jsonResponse(200, CARD)),
      image: resolved(jsonResponse(500, { message: "internal server error" })),
    })

    renderCardPage()

    await screen.findByText(PRODUCT_NAME)

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("internal server error")
    expect(screen.queryByText("The product has no photo")).not.toBeInTheDocument()
  })

  it("displays the photo with the accessible name after a successful load", async () => {
    stubGetResponses({
      card: resolved(jsonResponse(200, CARD)),
      image: resolved(binaryResponse(200, IMAGE_BYTES)),
    })

    renderCardPage()

    const image = await screen.findByRole("img", {
      name: `Photo of the product ${PRODUCT_NAME}`,
    })
    expect(image.getAttribute("src")).toContain("blob:")
  })
})

describe("ProductDetailsPage not-found state", () => {
  it("shows the missing-product state on a 404 response with the back action", async () => {
    stubGetResponses({
      card: resolved(jsonResponse(404, { message: "product not found" })),
    })

    renderCardPage()

    expect(await screen.findByText("Product not found")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Back to products" }),
    ).toBeInTheDocument()
    expect(screen.queryByText(PRODUCT_NAME)).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument()
  })

  it("shows the missing-product state after reopening the card following its deletion from the list", async () => {
    stubGetResponses({
      card: resolved(jsonResponse(404, { message: "product not found" })),
      image: resolved(jsonResponse(404, { message: "image not found" })),
      delete: resolved(new Response(null, { status: 204 })),
    })

    const queryClient = createTestQueryClient()
    queryClient.setQueryData(productDetailsQueryKey(PRODUCT_ID), CARD as unknown)

    const firstView = renderCardPage(`/products/${PRODUCT_ID}`, queryClient)

    expect(await screen.findByText(PRODUCT_NAME)).toBeInTheDocument()
    expect(cardGetCalls()).toHaveLength(0)

    firstView.unmount()

    const { result } = renderHook(() => useDeleteProduct(), {
      wrapper: createHookWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync(PRODUCT_ID)
    })

    expect(deleteCalls()).toHaveLength(1)

    renderCardPage(`/products/${PRODUCT_ID}`, queryClient)

    expect(await screen.findByText("Product not found")).toBeInTheDocument()
    expect(cardGetCalls()).toHaveLength(1)
    expect(
      queryClient.getQueryState(productDetailsQueryKey(PRODUCT_ID))?.status,
    ).toBe("success")
  })
})

describe("ProductDetailsPage error state", () => {
  it.each([
    [400, { message: "invalid product id" }, "invalid product id"],
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
        image: resolved(jsonResponse(404, { message: "image not found" })),
      })

      renderCardPage()

      const alert = await screen.findByRole("alert")
      expect(alert).toHaveTextContent(expectedMessage)
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
      expect(screen.queryByText(PRODUCT_NAME)).not.toBeInTheDocument()
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
      image: resolved(binaryResponse(200, IMAGE_BYTES)),
    })

    const user = userEvent.setup()
    renderCardPage()

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Server error. Please try again later.")

    await user.click(screen.getByRole("button", { name: "Retry" }))

    expect(await screen.findByText(PRODUCT_NAME)).toBeInTheDocument()
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
      image: resolved(binaryResponse(200, IMAGE_BYTES)),
    })

    renderCardPage()

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1))

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Product not found")).not.toBeInTheDocument()
  })
})

describe("ProductDetailsPage caching", () => {
  it("does not send a new card request when the card is reopened within the staleTime", async () => {
    stubGetResponses({
      card: resolved(jsonResponse(200, CARD)),
      image: resolved(jsonResponse(404, { message: "image not found" })),
    })

    const queryClient = createTestQueryClient()

    const firstView = renderCardPage(`/products/${PRODUCT_ID}`, queryClient)
    expect(await screen.findByText(PRODUCT_NAME)).toBeInTheDocument()
    firstView.unmount()

    renderCardPage(`/products/${PRODUCT_ID}`, queryClient)
    expect(await screen.findByText(PRODUCT_NAME)).toBeInTheDocument()

    expect(cardGetCalls()).toHaveLength(1)
  })
})

describe("ProductDetailsPage navigation and actions", () => {
  it("returns to the products list from the card", async () => {
    stubGetResponses({
      card: resolved(jsonResponse(200, CARD)),
      image: resolved(jsonResponse(404, { message: "image not found" })),
    })

    const user = userEvent.setup()
    renderCardPage()

    await user.click(
      await screen.findByRole("button", { name: "Back to products" }),
    )

    expect(await screen.findByText("products-list-marker")).toBeInTheDocument()
  })

  it("opens the photo dialog from the card with this product", async () => {
    stubGetResponses({
      card: resolved(jsonResponse(200, CARD)),
      image: resolved(jsonResponse(404, { message: "image not found" })),
      list: resolved(jsonResponse(200, [])),
    })

    const user = userEvent.setup()
    renderCardPage()

    await user.click(
      await screen.findByRole("button", {
        name: "Manage the photo of Liebherr CNel 4313",
      }),
    )

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(
      await screen.findByText(`Photo of the product ${PRODUCT_NAME}.`),
    ).toBeInTheDocument()
  })
})
