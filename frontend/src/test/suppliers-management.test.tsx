import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { UserEvent } from "@testing-library/user-event"
import { I18nextProvider } from "react-i18next"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { SuppliersListPage } from "@/pages/suppliers/SuppliersListPage"
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

const FORM_VALUES = {
  name: "ООО Ромашка",
  phone: "+7 (999) 123-45-67",
  country: "Belarus",
  city: "Minsk",
  street: "Nezavisimosti 1",
}

const CREATED_SUPPLIER: SupplierFixture = {
  id: "3",
  name: FORM_VALUES.name,
  phone_number: "+79991234567",
  address: {
    country: FORM_VALUES.country,
    city: FORM_VALUES.city,
    street: FORM_VALUES.street,
  },
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

function stubSuppliersGet(suppliers: SupplierFixture[] = SUPPLIERS): void {
  fetchMock.mockImplementation((_input, init) => {
    if (methodOf(init) === "GET") {
      return Promise.resolve(jsonResponse(200, suppliers))
    }

    return Promise.reject(new Error(`Unexpected ${methodOf(init)} request`))
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
        <SuppliersListPage />
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { ...view, queryClient }
}

async function openCreateDialog(
  user: UserEvent,
  buttonName = "Add supplier",
): Promise<HTMLElement> {
  await user.click(screen.getByRole("button", { name: buttonName }))

  return screen.findByRole("dialog")
}

async function fillCreateForm(user: UserEvent): Promise<void> {
  await user.type(screen.getByLabelText("Name"), FORM_VALUES.name)
  await user.type(screen.getByLabelText("Phone"), FORM_VALUES.phone)
  await user.type(screen.getByLabelText("Country"), FORM_VALUES.country)
  await user.type(screen.getByLabelText("City"), FORM_VALUES.city)
  await user.type(screen.getByLabelText("Street"), FORM_VALUES.street)
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

interface AddressDialogLabels {
  trigger: string
  menuItem: string
}

const EN_ADDRESS_LABELS: AddressDialogLabels = {
  trigger: "Actions for ООО Моя Оборона",
  menuItem: "Edit address",
}

async function openEditAddressDialog(
  user: UserEvent,
  labels: AddressDialogLabels = EN_ADDRESS_LABELS,
): Promise<HTMLElement> {
  const trigger = await screen.findByRole("button", { name: labels.trigger })
  await user.click(trigger)
  await user.click(
    await screen.findByRole("menuitem", { name: labels.menuItem }),
  )

  return screen.findByRole("dialog")
}

interface DeleteDialogLabels {
  trigger: string
  menuItem: string
}

const EN_DELETE_LABELS: DeleteDialogLabels = {
  trigger: "Actions for ООО Моя Оборона",
  menuItem: "Delete supplier ООО Моя Оборона",
}

async function openDeleteDialog(
  user: UserEvent,
  labels: DeleteDialogLabels = EN_DELETE_LABELS,
): Promise<HTMLElement> {
  const trigger = await screen.findByRole("button", { name: labels.trigger })
  await user.click(trigger)
  await user.click(
    await screen.findByRole("menuitem", { name: labels.menuItem }),
  )

  return screen.findByRole("alertdialog")
}

describe("SuppliersListPage supplier creation", () => {
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

  it("opens the creation dialog with all form fields", async () => {
    stubSuppliersGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)

    expect(within(dialog).getByLabelText("Name")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Phone")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Country")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("City")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Street")).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Create" }),
    ).toBeEnabled()
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeInTheDocument()
  })

  it("does not send a request when required fields are empty", async () => {
    stubSuppliersGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Create" }))

    expect(
      await within(dialog).findByText("Name is required"),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Phone is required")).toBeInTheDocument()
    expect(within(dialog).getByText("Country is required")).toBeInTheDocument()
    expect(within(dialog).getByText("City is required")).toBeInTheDocument()
    expect(within(dialog).getByText("Street is required")).toBeInTheDocument()
    expect(postCalls()).toHaveLength(0)
  })

  it("does not send a request when the phone does not match the backend rule", async () => {
    stubSuppliersGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)
    await user.type(screen.getByLabelText("Name"), FORM_VALUES.name)
    await user.type(screen.getByLabelText("Phone"), "89991234567")
    await user.type(screen.getByLabelText("Country"), FORM_VALUES.country)
    await user.type(screen.getByLabelText("City"), FORM_VALUES.city)
    await user.type(screen.getByLabelText("Street"), FORM_VALUES.street)
    await user.click(within(dialog).getByRole("button", { name: "Create" }))

    expect(
      await within(dialog).findByText("Enter a valid phone number"),
    ).toBeInTheDocument()
    expect(postCalls()).toHaveLength(0)
  })

  it("sends the entered phone unchanged, closes the dialog, invalidates the cache and refreshes the list", async () => {
    let getCalls = 0
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        getCalls += 1

        return Promise.resolve(
          jsonResponse(
            200,
            getCalls === 1 ? SUPPLIERS : [...SUPPLIERS, CREATED_SUPPLIER],
          ),
        )
      }

      if (method === "POST") {
        return Promise.resolve(jsonResponse(201, CREATED_SUPPLIER))
      }

      return Promise.reject(new Error(`Unexpected ${method} request`))
    })

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const user = userEvent.setup()
    renderPage(queryClient)

    const dialog = await openCreateDialog(user)
    await fillCreateForm(user)
    await user.click(within(dialog).getByRole("button", { name: "Create" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )

    const [url, init] = postCalls()[0]!
    expect(url).toBe("/api/v1/suppliers")
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "ООО Ромашка",
      phone_number: "+7 (999) 123-45-67",
      address: {
        country: "Belarus",
        city: "Minsk",
        street: "Nezavisimosti 1",
      },
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["suppliers"] })

    expect(await screen.findByText(CREATED_SUPPLIER.name)).toBeInTheDocument()
    expect(getCalls).toBe(2)
  })

  it("adds the Bearer token to the create request", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "test-token")
    stubSuppliersGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)
    await fillCreateForm(user)
    await user.click(within(dialog).getByRole("button", { name: "Create" }))

    await waitFor(() => expect(postCalls()).toHaveLength(1))
    expect(postCalls()[0]![1]?.headers).toMatchObject({
      Authorization: "Bearer test-token",
    })
  })

  it("shows the API message on 400 and keeps the dialog open with the input", async () => {
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, SUPPLIERS))
      }

      if (method === "POST") {
        return Promise.resolve(
          jsonResponse(400, { message: "phone number is already used" }),
        )
      }

      return Promise.reject(new Error(`Unexpected ${method} request`))
    })

    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)
    await fillCreateForm(user)
    await user.click(within(dialog).getByRole("button", { name: "Create" }))

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "phone number is already used",
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Name")).toHaveValue(
      FORM_VALUES.name,
    )
    expect(within(dialog).getByLabelText("Phone")).toHaveValue(
      FORM_VALUES.phone,
    )
    expect(within(dialog).getByLabelText("Country")).toHaveValue(
      FORM_VALUES.country,
    )
    expect(within(dialog).getByLabelText("City")).toHaveValue(FORM_VALUES.city)
    expect(within(dialog).getByLabelText("Street")).toHaveValue(
      FORM_VALUES.street,
    )
    expect(
      within(dialog).getByRole("button", { name: "Create" }),
    ).toBeEnabled()
  })

  it.each([
    [400, { error: "bad request" }, "Invalid request"],
    [500, { error: "internal error" }, "Server error. Please try again later."],
    [
      503,
      { error: "auth service unavailable" },
      "Server error. Please try again later.",
    ],
  ] as const)(
    "shows the fallback message for status %i",
    async (status, body, expectedMessage) => {
      fetchMock.mockImplementation((_input, init) => {
        const method = methodOf(init)

        if (method === "GET") {
          return Promise.resolve(jsonResponse(200, SUPPLIERS))
        }

        if (method === "POST") {
          return Promise.resolve(jsonResponse(status, body))
        }

        return Promise.reject(new Error(`Unexpected ${method} request`))
      })

      const user = userEvent.setup()
      renderPage()

      const dialog = await openCreateDialog(user)
      await fillCreateForm(user)
      await user.click(within(dialog).getByRole("button", { name: "Create" }))

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        expectedMessage,
      )
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    },
  )

  it("shows a network error when the create request fails without a response", async () => {
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, SUPPLIERS))
      }

      return Promise.reject(new TypeError("Failed to fetch"))
    })

    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)
    await fillCreateForm(user)
    await user.click(within(dialog).getByRole("button", { name: "Create" }))

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    )
    expect(within(dialog).getByLabelText("Name")).toHaveValue(
      FORM_VALUES.name,
    )
  })

  it("disables the submit and cancel buttons while the request is pending", async () => {
    let resolveCreate: (response: Response) => void = () => {}
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, SUPPLIERS))
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
    await user.click(within(dialog).getByRole("button", { name: "Create" }))

    expect(
      await within(dialog).findByRole("button", { name: "Creating..." }),
    ).toBeDisabled()
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled()

    await act(async () => {
      resolveCreate(jsonResponse(201, CREATED_SUPPLIER))
    })

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
  })

  it("resets the form and the mutation when the dialog is closed", async () => {
    stubSuppliersGet()
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
    expect(within(secondDialog).getByLabelText("Phone")).toHaveValue("")
    expect(
      within(secondDialog).queryByRole("alert"),
    ).not.toBeInTheDocument()
  })

  it("renders the creation form and validation in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubSuppliersGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user, "Добавить поставщика")

    expect(within(dialog).getByLabelText("Имя")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Телефон")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Страна")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Город")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Улица")).toBeInTheDocument()

    await user.click(within(dialog).getByRole("button", { name: "Создать" }))

    expect(await within(dialog).findByText("Укажите имя")).toBeInTheDocument()
    expect(within(dialog).getByText("Укажите телефон")).toBeInTheDocument()
    expect(within(dialog).getByText("Укажите страну")).toBeInTheDocument()
    expect(within(dialog).getByText("Укажите город")).toBeInTheDocument()
    expect(within(dialog).getByText("Укажите улицу")).toBeInTheDocument()
    expect(postCalls()).toHaveLength(0)
  })
})

describe("SuppliersListPage supplier deletion", () => {
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

  it("shows the supplier name in the confirmation dialog", async () => {
    stubSuppliersGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openDeleteDialog(user)

    expect(
      within(dialog).getByRole("heading", { name: "Delete supplier" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "Are you sure you want to delete ООО Моя Оборона? This action cannot be undone.",
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
    stubSuppliersGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openDeleteDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    )
    expect(deleteCalls()).toHaveLength(0)
    expect(screen.getByText("ООО Моя Оборона")).toBeInTheDocument()
  })

  it("sends DELETE with the supplier id, closes the dialog, invalidates the cache and refreshes the list", async () => {
    let getCalls = 0
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        getCalls += 1

        return Promise.resolve(
          jsonResponse(200, getCalls === 1 ? SUPPLIERS : [SUPPLIERS[1]!]),
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
    expect(url).toBe("/api/v1/suppliers/1")
    expect(init?.body).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["suppliers"] })

    await waitFor(() =>
      expect(screen.queryByText("ООО Моя Оборона")).not.toBeInTheDocument(),
    )
    expect(getCalls).toBe(2)
  })

  it.each([
    [
      400,
      { message: "supplier is used by products" },
      "supplier is used by products",
    ],
    [404, { message: "supplier not found" }, "supplier not found"],
    [404, { error: "not found" }, "Supplier not found"],
    [500, { error: "internal error" }, "Server error. Please try again later."],
    [
      503,
      { error: "auth service unavailable" },
      "Server error. Please try again later.",
    ],
  ] as const)(
    "shows the message for status %i and does not invalidate the cache",
    async (status, body, expectedMessage) => {
      fetchMock.mockImplementation((_input, init) => {
        const method = methodOf(init)

        if (method === "GET") {
          return Promise.resolve(jsonResponse(200, SUPPLIERS))
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
      expect(screen.getByText("ООО Моя Оборона")).toBeInTheDocument()
    },
  )

  it("shows a network error and does not invalidate the cache when the request fails without a response", async () => {
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, SUPPLIERS))
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
    expect(screen.getByText("ООО Моя Оборона")).toBeInTheDocument()
  })

  it("disables the confirm and cancel buttons while the deletion is pending", async () => {
    let resolveDelete: (response: Response) => void = () => {}
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, SUPPLIERS))
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
    stubSuppliersGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openDeleteDialog(user, {
      trigger: "Действия: ООО Моя Оборона",
      menuItem: "Удалить поставщика ООО Моя Оборона",
    })

    expect(
      within(dialog).getByRole("heading", { name: "Удалить поставщика" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "Удалить поставщика ООО Моя Оборона? Это действие нельзя отменить.",
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

describe("SuppliersListPage supplier address editing", () => {
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

  it("prefills the form with the supplier address without an extra request", async () => {
    stubSuppliersGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openEditAddressDialog(user)

    expect(
      within(dialog).getByRole("heading", { name: "Edit address" }),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Country")).toHaveValue("Russia")
    expect(within(dialog).getByLabelText("City")).toHaveValue("Moscow")
    expect(within(dialog).getByLabelText("Street")).toHaveValue("Tverskaya 1")

    const getRequests = fetchMock.mock.calls.filter(
      ([, init]) => methodOf(init) === "GET",
    )
    expect(getRequests).toHaveLength(1)
  })

  it("does not send a request when the address edit is cancelled", async () => {
    stubSuppliersGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openEditAddressDialog(user)
    const street = within(dialog).getByLabelText("Street")
    await user.clear(street)
    await user.type(street, "Novy Arbat 5")
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    expect(patchCalls()).toHaveLength(0)
    expect(screen.getByText("Tverskaya 1")).toBeInTheDocument()
  })

  it("sends PATCH with only the address, closes the dialog, invalidates the cache and refreshes the list", async () => {
    const updatedSupplier: SupplierFixture = {
      ...SUPPLIERS[0]!,
      address: {
        country: "Russia",
        city: "Moscow",
        street: "Novy Arbat 5",
      },
    }
    let getCalls = 0
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        getCalls += 1

        return Promise.resolve(
          jsonResponse(
            200,
            getCalls === 1 ? SUPPLIERS : [updatedSupplier, SUPPLIERS[1]!],
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

    const dialog = await openEditAddressDialog(user)
    const street = within(dialog).getByLabelText("Street")
    await user.clear(street)
    await user.type(street, "Novy Arbat 5")
    await user.click(within(dialog).getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )

    const [url, init] = patchCalls()[0]!
    expect(url).toBe("/api/v1/suppliers/1/address")
    expect(JSON.parse(String(init?.body))).toEqual({
      address: {
        country: "Russia",
        city: "Moscow",
        street: "Novy Arbat 5",
      },
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["suppliers"] })
    await waitFor(() => expect(getCalls).toBe(2))
    expect(await screen.findByText("Novy Arbat 5")).toBeInTheDocument()
  })

  it("shows the updated address when the dialog is reopened after the refresh", async () => {
    const updatedSupplier: SupplierFixture = {
      ...SUPPLIERS[0]!,
      address: {
        country: "Russia",
        city: "Moscow",
        street: "Novy Arbat 5",
      },
    }
    let getCalls = 0
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        getCalls += 1

        return Promise.resolve(
          jsonResponse(
            200,
            getCalls === 1 ? SUPPLIERS : [updatedSupplier, SUPPLIERS[1]!],
          ),
        )
      }

      if (method === "PATCH") {
        return Promise.resolve(new Response(null, { status: 204 }))
      }

      return Promise.reject(new Error(`Unexpected ${method} request`))
    })

    const user = userEvent.setup()
    renderPage()

    const dialog = await openEditAddressDialog(user)
    const street = within(dialog).getByLabelText("Street")
    await user.clear(street)
    await user.type(street, "Novy Arbat 5")
    await user.click(within(dialog).getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
    await waitFor(() => expect(getCalls).toBe(2))

    const reopened = await openEditAddressDialog(user)

    expect(within(reopened).getByLabelText("Street")).toHaveValue(
      "Novy Arbat 5",
    )
  })

  it.each([
    [400, { message: "invalid address" }, "invalid address"],
    [404, { message: "supplier not found" }, "supplier not found"],
    [500, { error: "internal error" }, "Server error. Please try again later."],
    [
      503,
      { error: "auth service unavailable" },
      "Server error. Please try again later.",
    ],
  ] as const)(
    "shows the message for status %i, keeps the dialog open with the input and does not invalidate the cache",
    async (status, body, expectedMessage) => {
      fetchMock.mockImplementation((_input, init) => {
        const method = methodOf(init)

        if (method === "GET") {
          return Promise.resolve(jsonResponse(200, SUPPLIERS))
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

      const dialog = await openEditAddressDialog(user)
      const street = within(dialog).getByLabelText("Street")
      await user.clear(street)
      await user.type(street, "Novy Arbat 5")
      await user.click(within(dialog).getByRole("button", { name: "Save" }))

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        expectedMessage,
      )
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(within(dialog).getByLabelText("Street")).toHaveValue(
        "Novy Arbat 5",
      )
      expect(invalidateSpy).not.toHaveBeenCalled()
    },
  )

  it("shows a network error and keeps the dialog open when the request fails without a response", async () => {
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, SUPPLIERS))
      }

      return Promise.reject(new TypeError("Failed to fetch"))
    })

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const user = userEvent.setup()
    renderPage(queryClient)

    const dialog = await openEditAddressDialog(user)
    const street = within(dialog).getByLabelText("Street")
    await user.clear(street)
    await user.type(street, "Novy Arbat 5")
    await user.click(within(dialog).getByRole("button", { name: "Save" }))

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Street")).toHaveValue(
      "Novy Arbat 5",
    )
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it("disables the save and cancel buttons while the request is pending", async () => {
    let resolvePatch: (response: Response) => void = () => {}
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, SUPPLIERS))
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

    const dialog = await openEditAddressDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Save" }))

    expect(
      await within(dialog).findByRole("button", { name: "Saving..." }),
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

  it("renders the address form in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubSuppliersGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openEditAddressDialog(user, {
      trigger: "Действия: ООО Моя Оборона",
      menuItem: "Изменить адрес",
    })

    expect(
      within(dialog).getByRole("heading", { name: "Изменить адрес" }),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Страна")).toHaveValue("Russia")
    expect(within(dialog).getByLabelText("Город")).toHaveValue("Moscow")
    expect(within(dialog).getByLabelText("Улица")).toHaveValue("Tverskaya 1")
    expect(
      within(dialog).getByRole("button", { name: "Сохранить" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Отмена" }),
    ).toBeInTheDocument()
  })
})
