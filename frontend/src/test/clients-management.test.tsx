import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { UserEvent } from "@testing-library/user-event"
import { I18nextProvider } from "react-i18next"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { ClientsListPage } from "@/pages/clients/ClientsListPage"
import {
  AUTH_TOKEN_STORAGE_KEY,
  setUnauthorizedHandler,
} from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

type ClientFixture = {
  id: string
  name: string
  surname: string
  birthday: string
  gender: string
  registration_date: string
  address?: {
    country?: string
    city?: string
    street?: string
  }
}

const CLIENTS: ClientFixture[] = [
  {
    id: "1",
    name: "Ivan",
    surname: "Ivanov",
    birthday: "1986-09-12",
    gender: "m",
    registration_date: new Date(2026, 8, 12, 12, 0).toISOString(),
    address: { country: "Russia", city: "Moscow", street: "Tverskaya 1" },
  },
  {
    id: "2",
    name: "Anna",
    surname: "Petrova",
    birthday: "1990-01-05",
    gender: "f",
    registration_date: new Date(2024, 0, 3, 9, 30).toISOString(),
    address: {
      country: "Russia",
      city: "Saint Petersburg",
      street: "Nevsky 2",
    },
  },
]

const FORM_VALUES = {
  name: "Petr",
  surname: "Sidorov",
  birthday: "2000-05-05",
  genderLabel: "N/A",
  gender: "n/a",
  country: "Russia",
  city: "Moscow",
  street: "Tverskaya 1",
}

const CREATED_CLIENT: ClientFixture = {
  id: "3",
  name: FORM_VALUES.name,
  surname: FORM_VALUES.surname,
  birthday: FORM_VALUES.birthday,
  gender: FORM_VALUES.gender,
  registration_date: new Date(2026, 9, 17, 10, 0).toISOString(),
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

function stubClientsGet(clients: ClientFixture[] = CLIENTS): void {
  fetchMock.mockImplementation((_input, init) => {
    if (methodOf(init) === "GET") {
      return Promise.resolve(jsonResponse(200, clients))
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
        <ClientsListPage />
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { ...view, queryClient }
}

async function openCreateDialog(
  user: UserEvent,
  buttonName = "Add client",
): Promise<HTMLElement> {
  await user.click(screen.getByRole("button", { name: buttonName }))

  return screen.findByRole("dialog")
}

async function fillCreateForm(user: UserEvent): Promise<void> {
  await user.type(screen.getByLabelText("Name"), FORM_VALUES.name)
  await user.type(screen.getByLabelText("Surname"), FORM_VALUES.surname)
  fireEvent.change(screen.getByLabelText("Birthday"), {
    target: { value: FORM_VALUES.birthday },
  })
  await user.click(screen.getByLabelText("Gender"))
  await user.click(
    await screen.findByRole("option", { name: FORM_VALUES.genderLabel }),
  )
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
  trigger: "Actions for Ivan Ivanov",
  menuItem: "Edit address",
}

async function openEditAddressDialog(
  user: UserEvent,
  labels: AddressDialogLabels = EN_ADDRESS_LABELS,
): Promise<HTMLElement> {
  const trigger = await screen.findByRole("button", { name: labels.trigger })
  await user.click(trigger)
  await user.click(await screen.findByRole("menuitem", { name: labels.menuItem }))

  return screen.findByRole("dialog")
}

interface DeleteDialogLabels {
  trigger: string
  menuItem: string
}

const EN_DELETE_LABELS: DeleteDialogLabels = {
  trigger: "Actions for Ivan Ivanov",
  menuItem: "Delete client Ivan Ivanov",
}

async function openDeleteDialog(
  user: UserEvent,
  labels: DeleteDialogLabels = EN_DELETE_LABELS,
): Promise<HTMLElement> {
  const trigger = await screen.findByRole("button", { name: labels.trigger })
  await user.click(trigger)
  await user.click(await screen.findByRole("menuitem", { name: labels.menuItem }))

  return screen.findByRole("alertdialog")
}

describe("ClientsListPage client creation", () => {
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
    stubClientsGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)

    expect(within(dialog).getByLabelText("Name")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Surname")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Birthday")).toHaveAttribute(
      "type",
      "date",
    )
    expect(within(dialog).getByLabelText("Gender")).toBeInTheDocument()
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

  it("offers only the contract gender values with localized labels", async () => {
    stubClientsGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)

    await user.click(within(dialog).getByLabelText("Gender"))

    const options = await screen.findAllByRole("option")
    expect(options.map((option) => option.textContent)).toEqual([
      "Male",
      "Female",
      "N/A",
    ])
  })

  it("does not send a request when the form is invalid", async () => {
    stubClientsGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Create" }))

    expect(
      await within(dialog).findByText("Name is required"),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Surname is required")).toBeInTheDocument()
    expect(within(dialog).getByText("Birthday is required")).toBeInTheDocument()
    expect(
      within(dialog).getByText("Select a valid gender"),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Country is required")).toBeInTheDocument()
    expect(within(dialog).getByText("City is required")).toBeInTheDocument()
    expect(within(dialog).getByText("Street is required")).toBeInTheDocument()
    expect(postCalls()).toHaveLength(0)
  })

  it("creates a client, closes the dialog, invalidates the cache and refreshes the list", async () => {
    let getCalls = 0
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        getCalls += 1

        return Promise.resolve(
          jsonResponse(200, getCalls === 1 ? CLIENTS : [...CLIENTS, CREATED_CLIENT]),
        )
      }

      if (method === "POST") {
        return Promise.resolve(jsonResponse(201, CREATED_CLIENT))
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
    expect(url).toBe("/api/v1/clients")
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Petr",
      surname: "Sidorov",
      birthday: "2000-05-05",
      gender: "n/a",
      address: {
        country: "Russia",
        city: "Moscow",
        street: "Tverskaya 1",
      },
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["clients"] })

    expect(await screen.findByText("Sidorov")).toBeInTheDocument()
    expect(getCalls).toBe(2)
  })

  it("adds the Bearer token to the create request", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "test-token")
    stubClientsGet()
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
        return Promise.resolve(jsonResponse(200, CLIENTS))
      }

      if (method === "POST") {
        return Promise.resolve(
          jsonResponse(400, {
            message: "client can't be younger than 16 years",
          }),
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
      "client can't be younger than 16 years",
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Petr")
    expect(within(dialog).getByLabelText("Surname")).toHaveValue("Sidorov")
    expect(within(dialog).getByLabelText("Birthday")).toHaveValue("2000-05-05")
    expect(within(dialog).getByLabelText("Street")).toHaveValue("Tverskaya 1")
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
          return Promise.resolve(jsonResponse(200, CLIENTS))
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
        return Promise.resolve(jsonResponse(200, CLIENTS))
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
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Petr")
  })

  it("disables the submit and cancel buttons while the request is pending", async () => {
    let resolveCreate: (response: Response) => void = () => {}
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, CLIENTS))
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
      resolveCreate(jsonResponse(201, CREATED_CLIENT))
    })

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
  })

  it("renders the creation form and validation in Russian", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    stubClientsGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openCreateDialog(user, "Добавить клиента")

    expect(within(dialog).getByLabelText("Имя")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Фамилия")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Дата рождения")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Пол")).toBeInTheDocument()
    expect(within(dialog).getByText("Выберите пол")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Страна")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Город")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Улица")).toBeInTheDocument()

    await user.click(within(dialog).getByRole("button", { name: "Создать" }))

    expect(await within(dialog).findByText("Укажите имя")).toBeInTheDocument()
    expect(within(dialog).getByText("Укажите фамилию")).toBeInTheDocument()
    expect(
      within(dialog).getByText("Выберите корректное значение пола"),
    ).toBeInTheDocument()
    expect(postCalls()).toHaveLength(0)
  })
})

describe("ClientsListPage client deletion", () => {
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

  it("shows the client name and surname in the confirmation dialog", async () => {
    stubClientsGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openDeleteDialog(user)

    expect(
      within(dialog).getByRole("heading", { name: "Delete client" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "Are you sure you want to delete Ivan Ivanov? This action cannot be undone.",
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
    stubClientsGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openDeleteDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    )
    expect(deleteCalls()).toHaveLength(0)
    expect(screen.getByText("Ivan")).toBeInTheDocument()
  })

  it("sends DELETE with the client id, closes the dialog, invalidates the cache and refreshes the list", async () => {
    let getCalls = 0
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        getCalls += 1

        return Promise.resolve(
          jsonResponse(200, getCalls === 1 ? CLIENTS : [CLIENTS[1]!]),
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
    expect(url).toBe("/api/v1/clients/1")
    expect(init?.body).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["clients"] })

    await waitFor(() =>
      expect(screen.queryByText("Ivan")).not.toBeInTheDocument(),
    )
    expect(getCalls).toBe(2)
  })

  it.each([
    [404, { message: "client not found" }, "client not found"],
    [404, { error: "not found" }, "Client not found"],
    [400, { error: "bad request" }, "Invalid request"],
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
          return Promise.resolve(jsonResponse(200, CLIENTS))
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
      expect(screen.getByText("Ivan")).toBeInTheDocument()
    },
  )

  it("shows a network error and does not invalidate the cache when the request fails without a response", async () => {
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, CLIENTS))
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
    expect(screen.getByText("Ivan")).toBeInTheDocument()
  })

  it("disables the confirm and cancel buttons while the deletion is pending", async () => {
    let resolveDelete: (response: Response) => void = () => {}
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, CLIENTS))
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
    stubClientsGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openDeleteDialog(user, {
      trigger: "Действия: Ivan Ivanov",
      menuItem: "Удалить клиента Ivan Ivanov",
    })

    expect(
      within(dialog).getByRole("heading", { name: "Удалить клиента" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "Удалить клиента Ivan Ivanov? Это действие нельзя отменить.",
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

describe("ClientsListPage client address editing", () => {
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

  it("prefills the form with the client address without an extra request", async () => {
    stubClientsGet()
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
    stubClientsGet()
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
  })

  it("sends PATCH with only the address, closes the dialog, invalidates the cache and refreshes the list", async () => {
    const updatedClient: ClientFixture = {
      ...CLIENTS[0]!,
      address: { country: "Russia", city: "Moscow", street: "Novy Arbat 5" },
    }
    let getCalls = 0
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        getCalls += 1

        return Promise.resolve(
          jsonResponse(
            200,
            getCalls === 1 ? CLIENTS : [updatedClient, CLIENTS[1]!],
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
    expect(url).toBe("/api/v1/clients/1/address")
    expect(JSON.parse(String(init?.body))).toEqual({
      address: {
        country: "Russia",
        city: "Moscow",
        street: "Novy Arbat 5",
      },
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["clients"] })
    await waitFor(() => expect(getCalls).toBe(2))
  })

  it("shows the updated address when the dialog is reopened after the refresh", async () => {
    const updatedClient: ClientFixture = {
      ...CLIENTS[0]!,
      address: { country: "Russia", city: "Moscow", street: "Novy Arbat 5" },
    }
    let getCalls = 0
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        getCalls += 1

        return Promise.resolve(
          jsonResponse(
            200,
            getCalls === 1 ? CLIENTS : [updatedClient, CLIENTS[1]!],
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
    [404, { error: "not found" }, "Client not found"],
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
          return Promise.resolve(jsonResponse(200, CLIENTS))
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
        return Promise.resolve(jsonResponse(200, CLIENTS))
      }

      return Promise.reject(new TypeError("Failed to fetch"))
    })

    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const user = userEvent.setup()
    renderPage(queryClient)

    const dialog = await openEditAddressDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Save" }))

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it("disables the save and cancel buttons while the request is pending", async () => {
    let resolvePatch: (response: Response) => void = () => {}
    fetchMock.mockImplementation((_input, init) => {
      const method = methodOf(init)

      if (method === "GET") {
        return Promise.resolve(jsonResponse(200, CLIENTS))
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
    stubClientsGet()
    const user = userEvent.setup()
    renderPage()

    const dialog = await openEditAddressDialog(user, {
      trigger: "Действия: Ivan Ivanov",
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
