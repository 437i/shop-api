import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { UserEvent } from "@testing-library/user-event"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import { MemoryRouter } from "react-router"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { ProductsListPage } from "@/pages/products/ProductsListPage"
import type { ProductFormValues } from "@/pages/products/productFormSchema"
import {
  productDetailsQueryKey,
  useProductDetails,
} from "@/pages/products/useProductDetails"
import {
  useCreateProduct,
  useDecreaseStock,
  useDeleteProduct,
} from "@/pages/products/useProductMutations"
import { productImageQueryKey } from "@/features/product-images/useProductImage"
import {
  AUTH_TOKEN_STORAGE_KEY,
  setUnauthorizedHandler,
} from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

type SupplierFixture = {
  id: string
  name: string
  phone_number: string
  address: {
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
      country: "Germany",
      city: "Berlin",
      street: "Alexanderplatz 2",
    },
  },
]

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

const FORM_VALUES = {
  name: "Liebherr CNel 4313",
  category: "Refrigerators",
  price: "999.99",
  stock: "5",
}

const SELECTED_SUPPLIER = SUPPLIERS[0]!

const CREATED_PRODUCT: ProductFixture = {
  id: "3",
  name: FORM_VALUES.name,
  category: { id: "c1", name: FORM_VALUES.category },
  price: FORM_VALUES.price,
  available_stock: 5,
}

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

function stubGet(
  products: ProductFixture[] = [],
  suppliers: SupplierFixture[] = SUPPLIERS,
): void {
  fetchMock.mockImplementation((input, init) => {
    if (methodOf(init) !== "GET") {
      return Promise.reject(new Error(`Unexpected ${methodOf(init)} request`))
    }

    if (urlOf(input).includes("/suppliers")) {
      return Promise.resolve(jsonResponse(200, suppliers))
    }

    return Promise.resolve(jsonResponse(200, products))
  })
}

function stubCreateResponse(
  status: number,
  body: unknown,
  suppliersGet: () => Promise<Response> = () =>
    Promise.resolve(jsonResponse(200, SUPPLIERS)),
): void {
  fetchMock.mockImplementation((input, init) => {
    const method = methodOf(init)

    if (method === "GET") {
      if (urlOf(input).includes("/suppliers")) {
        return suppliersGet()
      }

      return Promise.resolve(jsonResponse(200, []))
    }

    if (method === "POST") {
      return Promise.resolve(jsonResponse(status, body))
    }

    return Promise.reject(new Error(`Unexpected ${method} request`))
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

function renderPage(queryClient = createTestQueryClient()) {
  const view = render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={["/products"]}>
          <ProductsListPage />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { ...view, queryClient }
}

async function openCreateDialog(
  user: UserEvent,
  buttonName = "Add product",
): Promise<HTMLElement> {
  await user.click(screen.getByRole("button", { name: buttonName }))

  return screen.findByRole("dialog")
}

async function selectSupplier(
  user: UserEvent,
  supplierName = SELECTED_SUPPLIER.name,
): Promise<void> {
  await user.click(screen.getByLabelText("Supplier"))
  await user.click(await screen.findByRole("option", { name: supplierName }))
}

async function fillCreateForm(user: UserEvent): Promise<void> {
  await user.type(screen.getByLabelText("Name"), FORM_VALUES.name)
  await user.type(screen.getByLabelText("Category"), FORM_VALUES.category)
  await user.type(screen.getByLabelText("Price"), FORM_VALUES.price)
  await user.type(screen.getByLabelText("Available Stock"), FORM_VALUES.stock)
  await selectSupplier(user)
}

function postCalls() {
  return fetchMock.mock.calls.filter(([, init]) => methodOf(init) === "POST")
}

function deleteCalls() {
  return fetchMock.mock.calls.filter(([, init]) => methodOf(init) === "DELETE")
}

function patchCalls() {
  return fetchMock.mock.calls.filter(([, init]) => methodOf(init) === "PATCH")
}

async function openRowMenu(
  user: UserEvent,
  productName: string = PRODUCTS[0]!.name,
): Promise<void> {
  const trigger = await screen.findByRole("button", {
    name: `Actions for ${productName}`,
  })
  await user.click(trigger)
}

async function openDeleteDialog(
  user: UserEvent,
  productName: string = PRODUCTS[0]!.name,
): Promise<HTMLElement> {
  await openRowMenu(user, productName)
  await user.click(
    await screen.findByRole("menuitem", {
      name: `Delete product ${productName}`,
    }),
  )

  return screen.findByRole("alertdialog")
}

async function openDecreaseStockDialog(
  user: UserEvent,
  productName: string = PRODUCTS[0]!.name,
): Promise<HTMLElement> {
  await openRowMenu(user, productName)
  await user.click(
    await screen.findByRole("menuitem", { name: "Decrease stock" }),
  )

  return screen.findByRole("dialog")
}

describe("ProductsListPage product creation", () => {
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

  it("opens the creation dialog with all form fields and loads the suppliers", async () => {
    stubGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)

    expect(within(dialog).getByLabelText("Name")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Category")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Price")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Available Stock")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Supplier")).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeInTheDocument()

    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: "Create" }),
      ).toBeEnabled(),
    )
  })

  it("offers the supplier options from GET /suppliers with names and ids", async () => {
    stubGet()
    const user = userEvent.setup()
    renderPage()

    await openCreateDialog(user)
    await user.click(screen.getByLabelText("Supplier"))

    const options = await screen.findAllByRole("option")
    expect(options.map((option) => option.textContent)).toEqual(
      SUPPLIERS.map((supplier) => supplier.name),
    )
  })

  it("does not send a request when the form is invalid", async () => {
    stubGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)

    const createButton = within(dialog).getByRole("button", {
      name: "Create",
    })
    await waitFor(() => expect(createButton).toBeEnabled())
    await user.click(createButton)

    expect(
      await within(dialog).findByText("Name is required"),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Category is required")).toBeInTheDocument()
    expect(within(dialog).getByText("Price is required")).toBeInTheDocument()
    expect(
      within(dialog).getByText("Available stock is required"),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Supplier is required")).toBeInTheDocument()
    expect(postCalls()).toHaveLength(0)
  })

  it("sends the exact POST body, closes the dialog, invalidates the cache and refreshes the list", async () => {
    let productsGetCalls = 0
    fetchMock.mockImplementation((input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        if (urlOf(input).includes("/suppliers")) {
          return Promise.resolve(jsonResponse(200, SUPPLIERS))
        }

        productsGetCalls += 1

        return Promise.resolve(
          jsonResponse(200, productsGetCalls === 1 ? [] : [CREATED_PRODUCT]),
        )
      }

      if (method === "POST") {
        return Promise.resolve(jsonResponse(201, CREATED_PRODUCT))
      }

      return Promise.reject(new Error(`Unexpected ${method} request`))
    })

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const user = userEvent.setup()
    renderPage(queryClient)

    const dialog = await openCreateDialog(user)
    await fillCreateForm(user)

    const createButton = within(dialog).getByRole("button", {
      name: "Create",
    })
    await waitFor(() => expect(createButton).toBeEnabled())
    await user.click(createButton)

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )

    const [url, init] = postCalls()[0]!
    expect(url).toBe("/api/v1/products")
    expect(JSON.parse(String(init?.body))).toEqual({
      name: FORM_VALUES.name,
      category: { name: FORM_VALUES.category },
      price: FORM_VALUES.price,
      available_stock: 5,
      supplier_id: SELECTED_SUPPLIER.id,
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] })

    expect(await screen.findByText(CREATED_PRODUCT.name)).toBeInTheDocument()
    expect(productsGetCalls).toBe(2)
  })

  it("adds the Bearer token to the create request", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "test-token")
    stubCreateResponse(201, CREATED_PRODUCT)
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)
    await fillCreateForm(user)

    const createButton = within(dialog).getByRole("button", {
      name: "Create",
    })
    await waitFor(() => expect(createButton).toBeEnabled())
    await user.click(createButton)

    await waitFor(() => expect(postCalls()).toHaveLength(1))
    expect(postCalls()[0]![1]?.headers).toMatchObject({
      Authorization: "Bearer test-token",
    })
  })

  it("shows the API message on 400 and keeps the dialog open with the input", async () => {
    stubCreateResponse(400, { message: "invalid price" })
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)
    await fillCreateForm(user)

    const createButton = within(dialog).getByRole("button", {
      name: "Create",
    })
    await waitFor(() => expect(createButton).toBeEnabled())
    await user.click(createButton)

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "invalid price",
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Name")).toHaveValue(
      FORM_VALUES.name,
    )
    expect(within(dialog).getByLabelText("Category")).toHaveValue(
      FORM_VALUES.category,
    )
    expect(within(dialog).getByLabelText("Price")).toHaveValue(
      FORM_VALUES.price,
    )
    expect(within(dialog).getByLabelText("Available Stock")).toHaveValue(
      FORM_VALUES.stock,
    )
    expect(
      within(dialog).getByRole("button", { name: "Create" }),
    ).toBeEnabled()
  })

  it.each([
    [400, { error: "bad request" }, "Invalid request"],
    [404, { message: "supplier not found" }, "supplier not found"],
    [404, { error: "not found" }, "Supplier not found"],
    [500, { error: "internal error" }, "Server error. Please try again later."],
    [
      503,
      { error: "auth service unavailable" },
      "Server error. Please try again later.",
    ],
  ] as const)(
    "shows the expected message for status %i",
    async (status, body, expectedMessage) => {
      stubCreateResponse(status, body)
      const user = userEvent.setup()
      renderPage()

      const dialog = await openCreateDialog(user)
      await fillCreateForm(user)

      const createButton = within(dialog).getByRole("button", {
        name: "Create",
      })
      await waitFor(() => expect(createButton).toBeEnabled())
      await user.click(createButton)

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        expectedMessage,
      )
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    },
  )

  it("shows a network error when the create request fails without a response", async () => {
    fetchMock.mockImplementation((input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        if (urlOf(input).includes("/suppliers")) {
          return Promise.resolve(jsonResponse(200, SUPPLIERS))
        }

        return Promise.resolve(jsonResponse(200, []))
      }

      return Promise.reject(new TypeError("Failed to fetch"))
    })

    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)
    await fillCreateForm(user)

    const createButton = within(dialog).getByRole("button", {
      name: "Create",
    })
    await waitFor(() => expect(createButton).toBeEnabled())
    await user.click(createButton)

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    )
    expect(within(dialog).getByLabelText("Name")).toHaveValue(
      FORM_VALUES.name,
    )
  })

  it("disables the submit and cancel buttons while the request is pending", async () => {
    let resolveCreate: (response: Response) => void = () => {}
    fetchMock.mockImplementation((input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        if (urlOf(input).includes("/suppliers")) {
          return Promise.resolve(jsonResponse(200, SUPPLIERS))
        }

        return Promise.resolve(jsonResponse(200, []))
      }

      if (method === "POST") {
        return new Promise<Response>((resolve) => {
          resolveCreate = resolve
        })
      }

      return Promise.reject(new Error(`Unexpected ${method} request`))
    })

    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)
    await fillCreateForm(user)

    const createButton = within(dialog).getByRole("button", {
      name: "Create",
    })
    await waitFor(() => expect(createButton).toBeEnabled())
    await user.click(createButton)

    expect(
      await within(dialog).findByRole("button", { name: "Creating..." }),
    ).toBeDisabled()
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled()

    await act(async () => {
      resolveCreate(jsonResponse(201, CREATED_PRODUCT))
    })

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
  })

  it("disables the supplier select and submission while the suppliers are loading", async () => {
    fetchMock.mockImplementation((input, init) => {
      const method = methodOf(init)

      if (method !== "GET") {
        return Promise.reject(new Error(`Unexpected ${method} request`))
      }

      if (urlOf(input).includes("/suppliers")) {
        return new Promise<Response>(() => {})
      }

      return Promise.resolve(jsonResponse(200, []))
    })

    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)

    expect(
      await within(dialog).findByText("Loading suppliers..."),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Supplier")).toBeDisabled()
    expect(
      within(dialog).getByRole("button", { name: "Create" }),
    ).toBeDisabled()
    expect(postCalls()).toHaveLength(0)
  })

  it("disables the supplier select and submission when the suppliers request fails", async () => {
    stubCreateResponse(500, { error: "internal error" }, () =>
      Promise.resolve(jsonResponse(500, { error: "internal error" })),
    )
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)

    expect(
      await within(dialog).findByText("Failed to load suppliers"),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Supplier")).toBeDisabled()
    expect(
      within(dialog).getByRole("button", { name: "Create" }),
    ).toBeDisabled()
    expect(postCalls()).toHaveLength(0)
  })

  it("disables the supplier select and submission when the suppliers list is empty", async () => {
    stubGet([], [])
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)

    expect(
      await within(dialog).findByText("Create a supplier first"),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Supplier")).toBeDisabled()
    expect(
      within(dialog).getByRole("button", { name: "Create" }),
    ).toBeDisabled()
    expect(postCalls()).toHaveLength(0)
  })

  it("resets the form and the mutation when the dialog is closed", async () => {
    stubGet()
    const user = userEvent.setup()
    renderPage()

    const firstDialog = await openCreateDialog(user)
    await user.type(screen.getByLabelText("Name"), "Draft")
    await user.click(
      within(firstDialog).getByRole("button", { name: "Cancel" }),
    )

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )

    const secondDialog = await openCreateDialog(user)

    expect(within(secondDialog).getByLabelText("Name")).toHaveValue("")
    expect(within(secondDialog).getByLabelText("Category")).toHaveValue("")
    expect(within(secondDialog).getByLabelText("Price")).toHaveValue("")
    expect(within(secondDialog).getByLabelText("Available Stock")).toHaveValue(
      "",
    )
    expect(
      within(secondDialog).queryByRole("alert"),
    ).not.toBeInTheDocument()
  })

  it("renders the creation form and validation in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user, "Добавить товар")

    expect(within(dialog).getByLabelText("Название")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Категория")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Цена")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Доступный остаток")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Поставщик")).toBeInTheDocument()

    const createButton = within(dialog).getByRole("button", {
      name: "Создать",
    })
    await waitFor(() => expect(createButton).toBeEnabled())
    await user.click(createButton)

    expect(
      await within(dialog).findByText("Укажите название"),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Укажите категорию")).toBeInTheDocument()
    expect(within(dialog).getByText("Укажите цену")).toBeInTheDocument()
    expect(
      within(dialog).getByText("Укажите доступный остаток"),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText("Выберите поставщика", { selector: "p" }),
    ).toBeInTheDocument()
    expect(postCalls()).toHaveLength(0)
  })
})

describe("ProductsListPage product deletion", () => {
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

  it("shows the product name in the confirmation dialog", async () => {
    stubGet(PRODUCTS)
    const user = userEvent.setup()
    renderPage()

    const dialog = await openDeleteDialog(user)

    expect(
      within(dialog).getByRole("heading", { name: "Delete product" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "Are you sure you want to delete Liebherr CNel 4313? This action cannot be undone.",
      ),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Delete" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeInTheDocument()
  })

  it("does not send a request when the deletion is cancelled", async () => {
    stubGet(PRODUCTS)
    const user = userEvent.setup()
    renderPage()

    const dialog = await openDeleteDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    )
    expect(deleteCalls()).toHaveLength(0)
    expect(screen.getByText(PRODUCTS[0]!.name)).toBeInTheDocument()
  })

  it("sends DELETE /products/{id}, closes the dialog, invalidates the cache and removes the row", async () => {
    let getCalls = 0
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        getCalls += 1

        return Promise.resolve(
          jsonResponse(200, getCalls === 1 ? PRODUCTS : [PRODUCTS[1]!]),
        )
      }

      if (method === "DELETE") {
        return Promise.resolve(new Response(null, { status: 204 }))
      }

      return Promise.reject(new Error(`Unexpected ${method} request`))
    })

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const user = userEvent.setup()
    renderPage(queryClient)

    const dialog = await openDeleteDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Delete" }))

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    )

    const [url, init] = deleteCalls()[0]!
    expect(url).toBe("/api/v1/products/1")
    expect(init?.body).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] })

    await waitFor(() =>
      expect(screen.queryByText(PRODUCTS[0]!.name)).not.toBeInTheDocument(),
    )
    expect(screen.getByText(PRODUCTS[1]!.name)).toBeInTheDocument()
    expect(getCalls).toBe(2)
  })

  it.each([
    [404, { message: "product not found" }, "product not found"],
    [404, { error: "not found" }, "Product not found"],
    [500, { error: "internal error" }, "Server error. Please try again later."],
    [
      503,
      { error: "auth service unavailable" },
      "Server error. Please try again later.",
    ],
  ] as const)(
    "shows the message for status %i, keeps the dialog open and does not change the list",
    async (status, body, expectedMessage) => {
      fetchMock.mockImplementation((_input, init) => {
        const method = methodOf(init)

        if (method === "GET") {
          return Promise.resolve(jsonResponse(200, PRODUCTS))
        }

        if (method === "DELETE") {
          return Promise.resolve(jsonResponse(status, body))
        }

        return Promise.reject(new Error(`Unexpected ${method} request`))
      })

      const queryClient = createTestQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
      const user = userEvent.setup()
      renderPage(queryClient)

      const dialog = await openDeleteDialog(user)
      await user.click(within(dialog).getByRole("button", { name: "Delete" }))

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        expectedMessage,
      )
      expect(invalidateSpy).not.toHaveBeenCalled()
      expect(screen.getByRole("alertdialog")).toBeInTheDocument()
      expect(screen.getByText(PRODUCTS[0]!.name)).toBeInTheDocument()
    },
  )

  it("shows a network error and does not change the list when the request fails without a response", async () => {
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, PRODUCTS))
      }

      return Promise.reject(new TypeError("Failed to fetch"))
    })

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const user = userEvent.setup()
    renderPage(queryClient)

    const dialog = await openDeleteDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Delete" }))

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    )
    expect(invalidateSpy).not.toHaveBeenCalled()
    expect(screen.getByText(PRODUCTS[0]!.name)).toBeInTheDocument()
  })

  it("disables the confirm and cancel buttons while the deletion is pending", async () => {
    let resolveDelete: (response: Response) => void = () => {}
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, PRODUCTS))
      }

      if (method === "DELETE") {
        return new Promise<Response>((resolve) => {
          resolveDelete = resolve
        })
      }

      return Promise.reject(new Error(`Unexpected ${method} request`))
    })

    const user = userEvent.setup()
    renderPage()

    const dialog = await openDeleteDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Delete" }))

    expect(
      await within(dialog).findByRole("button", { name: "Deleting..." }),
    ).toBeDisabled()
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled()
    expect(deleteCalls()).toHaveLength(1)

    await act(async () => {
      resolveDelete(new Response(null, { status: 204 }))
    })

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    )
  })

  it("renders the delete confirmation in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubGet(PRODUCTS)
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole("button", {
        name: "Действия: Liebherr CNel 4313",
      }),
    )
    await user.click(
      await screen.findByRole("menuitem", {
        name: "Удалить товар Liebherr CNel 4313",
      }),
    )
    const dialog = await screen.findByRole("alertdialog")

    expect(
      within(dialog).getByRole("heading", { name: "Удалить товар" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "Удалить товар Liebherr CNel 4313? Это действие нельзя отменить.",
      ),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Удалить" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Отмена" }),
    ).toBeInTheDocument()
  })
})

describe("ProductsListPage stock decrease", () => {
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

  it("prefills the product name and stock without an extra request", async () => {
    stubGet(PRODUCTS)
    const user = userEvent.setup()
    renderPage()

    const dialog = await openDecreaseStockDialog(user)

    expect(
      within(dialog).getByRole("heading", { name: "Decrease stock" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "Product: Liebherr CNel 4313. Current stock: 5.",
      ),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Amount")).toHaveValue("")

    const getCalls = fetchMock.mock.calls.filter(
      ([, init]) => methodOf(init) === "GET",
    )
    expect(getCalls).toHaveLength(1)
  })

  it("does not send a request when the decrease is cancelled", async () => {
    stubGet(PRODUCTS)
    const user = userEvent.setup()
    renderPage()

    const dialog = await openDecreaseStockDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    expect(patchCalls()).toHaveLength(0)
    expect(screen.getByText(PRODUCTS[0]!.name)).toBeInTheDocument()
  })

  it.each([
    ["", "Amount is required"],
    ["0", "Amount must be a positive integer"],
    ["1.5", "Amount must be a positive integer"],
    ["6", "Amount must not exceed the current stock"],
  ])(
    "does not send a request when the amount is %j",
    async (amount, expectedMessage) => {
      stubGet(PRODUCTS)
      const user = userEvent.setup()
      renderPage()

      const dialog = await openDecreaseStockDialog(user)

      if (amount !== "") {
        await user.type(within(dialog).getByLabelText("Amount"), amount)
      }

      await user.click(within(dialog).getByRole("button", { name: "Decrease" }))

      expect(
        await within(dialog).findByText(expectedMessage),
      ).toBeInTheDocument()
      expect(patchCalls()).toHaveLength(0)
    },
  )

  it("sends PATCH with the numeric amount, invalidates the cache and shows the decreased stock", async () => {
    let getCalls = 0
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        getCalls += 1

        return Promise.resolve(
          jsonResponse(
            200,
            getCalls === 1
              ? PRODUCTS
              : [{ ...PRODUCTS[0]!, available_stock: 3 }, PRODUCTS[1]!],
          ),
        )
      }

      if (method === "PATCH") {
        return Promise.resolve(new Response(null, { status: 204 }))
      }

      return Promise.reject(new Error(`Unexpected ${method} request`))
    })

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const user = userEvent.setup()
    renderPage(queryClient)

    const dialog = await openDecreaseStockDialog(user)
    await user.type(within(dialog).getByLabelText("Amount"), "2")
    await user.click(within(dialog).getByRole("button", { name: "Decrease" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )

    const [url, init] = patchCalls()[0]!
    expect(url).toBe("/api/v1/products/1/stock")
    expect(JSON.parse(String(init?.body))).toEqual({ amount: 2 })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] })

    await waitFor(() =>
      expect(within(screen.getByRole("table")).getByText("3")).toBeInTheDocument(),
    )
    expect(getCalls).toBe(2)
  })

  it("removes the row from the refreshed list when the stock is decreased to zero", async () => {
    let getCalls = 0
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        getCalls += 1

        return Promise.resolve(
          jsonResponse(200, getCalls === 1 ? PRODUCTS : [PRODUCTS[1]!]),
        )
      }

      if (method === "PATCH") {
        return Promise.resolve(new Response(null, { status: 204 }))
      }

      return Promise.reject(new Error(`Unexpected ${method} request`))
    })

    const user = userEvent.setup()
    renderPage()

    const dialog = await openDecreaseStockDialog(user)
    await user.type(within(dialog).getByLabelText("Amount"), "5")
    await user.click(within(dialog).getByRole("button", { name: "Decrease" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    await waitFor(() =>
      expect(screen.queryByText(PRODUCTS[0]!.name)).not.toBeInTheDocument(),
    )
    expect(screen.getByText(PRODUCTS[1]!.name)).toBeInTheDocument()
  })

  it("shows the zero warning when the amount equals the stock and hides it below", async () => {
    stubGet(PRODUCTS)
    const user = userEvent.setup()
    renderPage()

    const dialog = await openDecreaseStockDialog(user)
    const amount = within(dialog).getByLabelText("Amount")

    await user.type(amount, "5")
    expect(
      await within(dialog).findByText(
        "The stock will become 0 and the product will disappear from the list, because restocking is not supported.",
      ),
    ).toBeInTheDocument()

    await user.clear(amount)
    await user.type(amount, "2")
    await waitFor(() =>
      expect(
        within(dialog).queryByText("The stock will become 0", {
          exact: false,
        }),
      ).not.toBeInTheDocument(),
    )
  })

  it.each([
    [409, { message: "insufficient stock" }, "insufficient stock"],
    [409, { error: "conflict" }, "Insufficient stock"],
    [500, { error: "internal error" }, "Server error. Please try again later."],
    [
      503,
      { error: "auth service unavailable" },
      "Server error. Please try again later.",
    ],
  ] as const)(
    "shows the message for status %i and keeps the form open",
    async (status, body, expectedMessage) => {
      fetchMock.mockImplementation((_input, init) => {
        const method = methodOf(init)

        if (method === "GET") {
          return Promise.resolve(jsonResponse(200, PRODUCTS))
        }

        if (method === "PATCH") {
          return Promise.resolve(jsonResponse(status, body))
        }

        return Promise.reject(new Error(`Unexpected ${method} request`))
      })

      const queryClient = createTestQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
      const user = userEvent.setup()
      renderPage(queryClient)

      const dialog = await openDecreaseStockDialog(user)
      await user.type(within(dialog).getByLabelText("Amount"), "2")
      await user.click(
        within(dialog).getByRole("button", { name: "Decrease" }),
      )

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        expectedMessage,
      )
      expect(invalidateSpy).not.toHaveBeenCalled()
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    },
  )

  it("shows a network error and keeps the form open when the request fails without a response", async () => {
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, PRODUCTS))
      }

      return Promise.reject(new TypeError("Failed to fetch"))
    })

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const user = userEvent.setup()
    renderPage(queryClient)

    const dialog = await openDecreaseStockDialog(user)
    await user.type(within(dialog).getByLabelText("Amount"), "2")
    await user.click(within(dialog).getByRole("button", { name: "Decrease" }))

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    )
    expect(invalidateSpy).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("disables the submit and cancel buttons while the request is pending", async () => {
    let resolvePatch: (response: Response) => void = () => {}
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, PRODUCTS))
      }

      if (method === "PATCH") {
        return new Promise<Response>((resolve) => {
          resolvePatch = resolve
        })
      }

      return Promise.reject(new Error(`Unexpected ${method} request`))
    })

    const user = userEvent.setup()
    renderPage()

    const dialog = await openDecreaseStockDialog(user)
    await user.type(within(dialog).getByLabelText("Amount"), "2")
    await user.click(within(dialog).getByRole("button", { name: "Decrease" }))

    expect(
      await within(dialog).findByRole("button", { name: "Decreasing..." }),
    ).toBeDisabled()
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled()
    expect(patchCalls()).toHaveLength(1)

    await act(async () => {
      resolvePatch(new Response(null, { status: 204 }))
    })

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
  })

  it("renders the stock decrease dialog in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubGet(PRODUCTS)
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole("button", {
        name: "Действия: Liebherr CNel 4313",
      }),
    )
    await user.click(
      await screen.findByRole("menuitem", { name: "Уменьшить остаток" }),
    )
    const dialog = await screen.findByRole("dialog")

    expect(
      within(dialog).getByRole("heading", { name: "Уменьшить остаток" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "Товар: Liebherr CNel 4313. Текущий остаток: 5.",
      ),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Количество")).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Уменьшить" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Отмена" }),
    ).toBeInTheDocument()
  })
})

describe("ProductsListPage product notifications", () => {
  let successSpy: ReturnType<typeof vi.spyOn>

  const NOTIFICATION_FORM_VALUES: ProductFormValues = {
    name: FORM_VALUES.name,
    category: FORM_VALUES.category,
    price: FORM_VALUES.price,
    stock: FORM_VALUES.stock,
    supplierId: SELECTED_SUPPLIER.id,
  }

  beforeEach(async () => {
    localStorage.clear()
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", fetchMock)
    successSpy = vi.spyOn(toast, "success")

    await act(async () => {
      await i18n.changeLanguage("en")
    })
  })

  afterEach(() => {
    setUnauthorizedHandler(null)
    toast.dismiss()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function createWrapper() {
    const queryClient = createTestQueryClient()

    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        </QueryClientProvider>
      )
    }
  }

  it("notifies about a created product", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, CREATED_PRODUCT))
    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync(NOTIFICATION_FORM_VALUES)
    })

    expect(successSpy).toHaveBeenCalledTimes(1)
    expect(successSpy).toHaveBeenCalledWith("Product created")
  })

  it("notifies about a deleted product", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    const { result } = renderHook(() => useDeleteProduct(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync("1")
    })

    expect(successSpy).toHaveBeenCalledTimes(1)
    expect(successSpy).toHaveBeenCalledWith("Product deleted")
  })

  it("notifies about a decreased stock", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    const { result } = renderHook(() => useDecreaseStock(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({ productId: "1", amount: "2" })
    })

    expect(successSpy).toHaveBeenCalledTimes(1)
    expect(successSpy).toHaveBeenCalledWith("Stock decreased")
  })

  it("shows a separate notification for every successful mutation", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(201, CREATED_PRODUCT)),
    )
    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync(NOTIFICATION_FORM_VALUES)
    })
    await act(async () => {
      await result.current.mutateAsync(NOTIFICATION_FORM_VALUES)
    })

    expect(successSpy).toHaveBeenCalledTimes(2)
  })

  it.each([400, 404, 409, 500, 503])(
    "does not notify when the create request fails with %i",
    async (status) => {
      fetchMock.mockResolvedValue(jsonResponse(status, { message: "failed" }))
      const { result } = renderHook(() => useCreateProduct(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await expect(
          result.current.mutateAsync(NOTIFICATION_FORM_VALUES),
        ).rejects.toThrow()
      })

      expect(successSpy).not.toHaveBeenCalled()
    },
  )

  it("does not notify when the stock decrease fails with 409", async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { message: "not enough" }))
    const { result } = renderHook(() => useDecreaseStock(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ productId: "1", amount: "2" }),
      ).rejects.toThrow()
    })

    expect(successSpy).not.toHaveBeenCalled()
  })

  it("does not notify when the request fails without a response", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync(NOTIFICATION_FORM_VALUES),
      ).rejects.toThrow()
    })

    expect(successSpy).not.toHaveBeenCalled()
  })

  it("does not notify when the session ends with 401", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: "expired" }))
    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync(NOTIFICATION_FORM_VALUES),
      ).rejects.toThrow()
    })

    expect(successSpy).not.toHaveBeenCalled()
  })
})

describe("ProductsListPage product card cache", () => {
  const PRODUCT_ID = "1"

  function createHookWrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        </QueryClientProvider>
      )
    }
  }

  const CARD = {
    id: PRODUCT_ID,
    name: "Liebherr CNel 4313",
    category: { id: "c1", name: "Refrigerators" },
    price: "999.99",
    available_stock: 5,
    last_update_date: "2026-09-12T12:00:00Z",
    image_id: "image-1",
    supplier: {
      id: "s1",
      name: "Liebherr",
      phone_number: "+78123456789",
      address: { country: "Germany", city: "Berlin", street: "Alexanderplatz 2" },
    },
  }

  const DECREASED_CARD = { ...CARD, available_stock: 3 }
  const IMAGE_CACHE_SENTINEL = { url: "object-url" } as unknown

  let fetchMock: Mock<typeof fetch>

  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function cardGetCalls() {
    return fetchMock.mock.calls.filter(
      ([input, init]) =>
        methodOf(init) === "GET" && urlOf(input) === "/api/v1/products/1",
    )
  }

  function imageGetCalls() {
    return fetchMock.mock.calls.filter(
      ([input, init]) =>
        methodOf(init) === "GET" && urlOf(input) === "/api/v1/products/1/image",
    )
  }

  function seedCardCaches(queryClient: QueryClient): void {
    queryClient.setQueryData(productDetailsQueryKey(PRODUCT_ID), CARD as unknown)
    queryClient.setQueryData(
      productImageQueryKey(PRODUCT_ID),
      IMAGE_CACHE_SENTINEL,
    )
  }

  function stubStockDecrease(): void {
    fetchMock.mockImplementation((input, init) => {
      const method = methodOf(init)

      if (method === "PATCH") {
        return Promise.resolve(new Response(null, { status: 204 }))
      }

      if (method === "GET" && urlOf(input) === "/api/v1/products/1") {
        return Promise.resolve(jsonResponse(200, DECREASED_CARD))
      }

      return Promise.reject(new Error(`Unexpected ${method} request`))
    })
  }

  function stubProductDeletion(): void {
    fetchMock.mockImplementation((input, init) => {
      const method = methodOf(init)

      if (method === "DELETE") {
        return Promise.resolve(new Response(null, { status: 204 }))
      }

      if (method === "GET" && urlOf(input) === "/api/v1/products/1") {
        return Promise.resolve(
          jsonResponse(404, { message: "product not found" }),
        )
      }

      return Promise.reject(new Error(`Unexpected ${method} request`))
    })
  }

  it("refetches the card on the next open after a stock decrease and leaves the photo cache untouched", async () => {
    stubStockDecrease()
    const queryClient = createTestQueryClient()
    seedCardCaches(queryClient)
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const card = renderHook(() => useProductDetails(PRODUCT_ID), {
      wrapper: createHookWrapper(queryClient),
    })

    await waitFor(() => expect(card.result.current.isLoading).toBe(false))
    expect(card.result.current.product).toEqual(CARD)
    expect(cardGetCalls()).toHaveLength(0)

    card.unmount()

    const { result } = renderHook(() => useDecreaseStock(), {
      wrapper: createHookWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({ productId: PRODUCT_ID, amount: "2" })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["product"] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] })

    const reopened = renderHook(() => useProductDetails(PRODUCT_ID), {
      wrapper: createHookWrapper(queryClient),
    })

    await waitFor(() => expect(reopened.result.current.product).toEqual(DECREASED_CARD))

    expect(cardGetCalls()).toHaveLength(1)

    expect(queryClient.getQueryData(productImageQueryKey(PRODUCT_ID))).toBe(
      IMAGE_CACHE_SENTINEL,
    )
    expect(imageGetCalls()).toHaveLength(0)
  })

  it("refetches the card on the next open after a product deletion and leaves the photo cache untouched", async () => {
    stubProductDeletion()
    const queryClient = createTestQueryClient()
    seedCardCaches(queryClient)
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const card = renderHook(() => useProductDetails(PRODUCT_ID), {
      wrapper: createHookWrapper(queryClient),
    })

    await waitFor(() => expect(card.result.current.isLoading).toBe(false))
    expect(card.result.current.product).toEqual(CARD)
    expect(cardGetCalls()).toHaveLength(0)

    card.unmount()

    const { result } = renderHook(() => useDeleteProduct(), {
      wrapper: createHookWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync(PRODUCT_ID)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["product"] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] })

    const reopened = renderHook(() => useProductDetails(PRODUCT_ID), {
      wrapper: createHookWrapper(queryClient),
    })

    await waitFor(() =>
      expect(reopened.result.current.product).toBeNull(),
    )

    expect(cardGetCalls()).toHaveLength(1)
    expect(
      queryClient.getQueryState(productDetailsQueryKey(PRODUCT_ID))?.status,
    ).toBe("success")

    expect(queryClient.getQueryData(productImageQueryKey(PRODUCT_ID))).toBe(
      IMAGE_CACHE_SENTINEL,
    )
    expect(imageGetCalls()).toHaveLength(0)
  })
})
