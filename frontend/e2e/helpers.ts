import type { Page, Route } from "@playwright/test"

export const MOCK_TOKEN = "mock-access-token"

export interface MockClientAddress {
  country?: string
  city?: string
  street?: string
}

export interface MockClient {
  id: string
  name: string
  surname: string
  birthday: string
  gender: string
  registration_date: string
  address?: MockClientAddress
}

export const MOCK_CLIENTS: MockClient[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Ivan",
    surname: "Ivanov",
    birthday: "1986-09-12",
    gender: "m",
    registration_date: "2026-09-12T12:00:00Z",
    address: { country: "Russia", city: "Moscow", street: "Tverskaya 1" },
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Anna",
    surname: "Petrova",
    birthday: "1990-01-05",
    gender: "f",
    registration_date: "2024-01-03T09:30:00Z",
    address: {
      country: "Russia",
      city: "Saint Petersburg",
      street: "Nevsky 2",
    },
  },
]

export interface MockApiError {
  status: number
  message?: string
}

export interface MockApiOptions {
  createError?: MockApiError
  deleteError?: MockApiError
  updateAddressError?: MockApiError
}

export interface MockApiHandle {
  deleteRequests: string[]
}

function clientIdFromUrl(url: string): string {
  const match = /\/clients\/([^/]+)(?:\/address)?$/.exec(new URL(url).pathname)

  return match?.[1] ? decodeURIComponent(match[1]) : ""
}

async function fulfillError(route: Route, error: MockApiError): Promise<void> {
  await route.fulfill({
    status: error.status,
    contentType: "application/json",
    body: JSON.stringify(error.message ? { message: error.message } : {}),
  })
}

export async function mockApi(
  page: Page,
  options: MockApiOptions = {},
): Promise<MockApiHandle> {
  const clients = structuredClone(MOCK_CLIENTS)
  const deleteRequests: string[] = []

  await page.route(/\/api\/v1\/auth$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: MOCK_TOKEN }),
    }),
  )

  await page.route(/\/api\/v1\/clients$/, (route) => {
    const request = route.request()

    if (request.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(clients),
      })
    }

    if (request.method() === "POST") {
      if (options.createError) {
        return fulfillError(route, options.createError)
      }

      const body = request.postDataJSON() as {
        name: string
        surname: string
        birthday: string
        gender: string
        address: MockClientAddress
      }

      const created: MockClient = {
        id: crypto.randomUUID(),
        name: body.name,
        surname: body.surname,
        birthday: body.birthday,
        gender: body.gender,
        registration_date: new Date().toISOString(),
        address: body.address,
      }

      clients.push(created)

      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(created),
      })
    }

    return route.fallback()
  })

  await page.route(/\/api\/v1\/clients\/[^/]+\/address$/, (route) => {
    if (route.request().method() !== "PATCH") {
      return route.fallback()
    }

    if (options.updateAddressError) {
      return fulfillError(route, options.updateAddressError)
    }

    const client = clients.find(
      (entry) => entry.id === clientIdFromUrl(route.request().url()),
    )
    const body = route.request().postDataJSON() as {
      address: MockClientAddress
    }

    if (client) {
      client.address = body.address
    }

    return route.fulfill({ status: 204 })
  })

  await page.route(/\/api\/v1\/clients\/[^/]+$/, (route) => {
    if (route.request().method() !== "DELETE") {
      return route.fallback()
    }

    const id = clientIdFromUrl(route.request().url())
    deleteRequests.push(id)

    if (options.deleteError) {
      return fulfillError(route, options.deleteError)
    }

    const index = clients.findIndex((entry) => entry.id === id)

    if (index >= 0) {
      clients.splice(index, 1)
    }

    return route.fulfill({ status: 204 })
  })

  return { deleteRequests }
}

export async function login(page: Page): Promise<void> {
  await page.goto("/auth/login")
  await page.getByLabel("Email").fill("admin@example.com")
  await page.getByLabel("Password").fill("secret")
  await page.getByRole("button", { name: "Sign In", exact: true }).click()
  await page.waitForURL(/\/clients$/)
}
