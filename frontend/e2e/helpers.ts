import type { Page, Route } from "@playwright/test"

export const MOCK_TOKEN = "mock-access-token"

export interface MockClientAddress {
  country?: string
  city?: string
  street?: string
}

export interface MockSupplierAddress {
  country?: string
  city?: string
  street?: string
}

export interface MockSupplier {
  id: string
  name: string
  phone_number: string
  address: MockSupplierAddress
}

export const MOCK_SUPPLIERS: MockSupplier[] = [
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "ООО Моя Оборона",
    phone_number: "+79991234567",
    address: { country: "Russia", city: "Moscow", street: "Tverskaya 1" },
  },
]

export interface MockProduct {
  id: string
  name: string
  category?: { id: string; name: string }
  price?: string
  available_stock?: number
}

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Liebherr CNel 4313",
    category: {
      id: "55555555-5555-5555-5555-555555555551",
      name: "Refrigerators",
    },
    price: "999.99",
    available_stock: 5,
  },
  {
    id: "44444444-4444-4444-4444-444444444445",
    name: "Bosch SMV6ZCX49E",
    category: {
      id: "55555555-5555-5555-5555-555555555552",
      name: "Dishwashers",
    },
    price: "749.00",
    available_stock: 12,
  },
  {
    id: "44444444-4444-4444-4444-444444444446",
    name: "Samsung WW90T554DAW",
    category: {
      id: "55555555-5555-5555-5555-555555555553",
      name: "Washing machines",
    },
    price: "649.50",
    available_stock: 3,
  },
]

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
  createSupplierError?: MockApiError
  deleteSupplierError?: MockApiError
  updateSupplierAddressError?: MockApiError
  productsList?: MockProduct[]
  productsListError?: MockApiError
}

export interface MockApiHandle {
  deleteRequests: string[]
  deleteSupplierRequests: string[]
}

function clientIdFromUrl(url: string): string {
  const match = /\/clients\/([^/]+)(?:\/address)?$/.exec(new URL(url).pathname)

  return match?.[1] ? decodeURIComponent(match[1]) : ""
}

function supplierIdFromUrl(url: string): string {
  const match = /\/suppliers\/([^/]+)(?:\/address)?$/.exec(
    new URL(url).pathname,
  )

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
  const suppliers = structuredClone(MOCK_SUPPLIERS)
  const deleteRequests: string[] = []
  const deleteSupplierRequests: string[] = []

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

  await page.route(/\/api\/v1\/suppliers$/, (route) => {
    const request = route.request()

    if (request.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(suppliers),
      })
    }

    if (request.method() === "POST") {
      if (options.createSupplierError) {
        return fulfillError(route, options.createSupplierError)
      }

      const body = request.postDataJSON() as {
        name: string
        phone_number: string
        address: MockSupplierAddress
      }

      const created: MockSupplier = {
        id: crypto.randomUUID(),
        name: body.name,
        phone_number: body.phone_number,
        address: body.address,
      }

      suppliers.push(created)

      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(created),
      })
    }

    return route.fallback()
  })

  await page.route(/\/api\/v1\/suppliers\/[^/]+\/address$/, (route) => {
    if (route.request().method() !== "PATCH") {
      return route.fallback()
    }

    if (options.updateSupplierAddressError) {
      return fulfillError(route, options.updateSupplierAddressError)
    }

    const supplier = suppliers.find(
      (entry) => entry.id === supplierIdFromUrl(route.request().url()),
    )
    const body = route.request().postDataJSON() as {
      address: MockSupplierAddress
    }

    if (supplier) {
      supplier.address = body.address
    }

    return route.fulfill({ status: 204 })
  })

  await page.route(/\/api\/v1\/suppliers\/[^/]+$/, (route) => {
    if (route.request().method() !== "DELETE") {
      return route.fallback()
    }

    const id = supplierIdFromUrl(route.request().url())
    deleteSupplierRequests.push(id)

    if (options.deleteSupplierError) {
      return fulfillError(route, options.deleteSupplierError)
    }

    const index = suppliers.findIndex((entry) => entry.id === id)

    if (index >= 0) {
      suppliers.splice(index, 1)
    }

    return route.fulfill({ status: 204 })
  })

  await page.route(/\/api\/v1\/products$/, (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback()
    }

    if (options.productsListError) {
      return fulfillError(route, options.productsListError)
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(options.productsList ?? MOCK_PRODUCTS),
    })
  })

  return { deleteRequests, deleteSupplierRequests }
}

export async function login(page: Page): Promise<void> {
  await page.goto("/auth/login")
  await page.getByLabel("Email").fill("admin@example.com")
  await page.getByLabel("Password").fill("secret")
  await page.getByRole("button", { name: "Sign In", exact: true }).click()
  await page.waitForURL(/\/clients$/)
}
