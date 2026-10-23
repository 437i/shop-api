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
  image_id?: string
}

const PRODUCT_DETAILS_SEED_DATE = "2026-09-12T12:00:00Z"

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
  createProductError?: MockApiError
  deleteProductError?: MockApiError
  decreaseStockError?: MockApiError
  /**
   * Fails only the first GET request of every list endpoint with the given
   * error. The following GET requests of the same list succeed, which allows
   * to exercise the retry action of a failing list.
   */
  listErrorOnce?: MockApiError
  /**
   * Delays every list response by the given amount of milliseconds, which
   * allows to observe the state of a running list request.
   */
  listDelayMs?: number
}

export interface MockApiHandle {
  deleteRequests: string[]
  deleteSupplierRequests: string[]
  deleteProductRequests: string[]
  decreaseStockRequests: { id: string; amount: number }[]
  clientsListRequests: number
  productsListRequests: number
  suppliersListRequests: number
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

function productIdFromUrl(url: string): string {
  const match = /\/products\/([^/]+)(?:\/(?:stock|image))?$/.exec(
    new URL(url).pathname,
  )

  return match?.[1] ? decodeURIComponent(match[1]) : ""
}

function imageIdFromUrl(url: string): string {
  const match = /\/images\/([^/]+)$/.exec(new URL(url).pathname)

  return match?.[1] ? decodeURIComponent(match[1]) : ""
}

async function delay(delayMs: number): Promise<void> {
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

async function fulfillError(
  route: Route,
  error: MockApiError,
  delayMs = 0,
): Promise<void> {
  await delay(delayMs)
  await route.fulfill({
    status: error.status,
    contentType: "application/json",
    body: JSON.stringify(error.message ? { message: error.message } : {}),
  })
}

function productFullResponse(
  product: MockProduct,
  supplier: MockSupplier | undefined,
): object {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    available_stock: product.available_stock,
    image_id: product.image_id,
    last_update_date: PRODUCT_DETAILS_SEED_DATE,
    supplier: supplier
      ? {
          id: supplier.id,
          name: supplier.name,
          phone_number: supplier.phone_number,
          address: {
            country: supplier.address.country,
            city: supplier.address.city,
            street: supplier.address.street,
          },
        }
      : undefined,
  }
}

async function fulfillList(
  route: Route,
  body: unknown,
  delayMs = 0,
): Promise<void> {
  await delay(delayMs)
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  })
}

export async function mockApi(
  page: Page,
  options: MockApiOptions = {},
): Promise<MockApiHandle> {
  const clients = structuredClone(MOCK_CLIENTS)
  const suppliers = structuredClone(MOCK_SUPPLIERS)
  const products = structuredClone(options.productsList ?? MOCK_PRODUCTS)
  const images = new Map<string, { productId: string; bytes: Buffer }>()
  const deleteRequests: string[] = []
  const deleteSupplierRequests: string[] = []
  const deleteProductRequests: string[] = []
  const decreaseStockRequests: { id: string; amount: number }[] = []
  let clientsListRequests = 0
  let productsListRequests = 0
  let suppliersListRequests = 0

  await page.route(/\/api\/v1\/auth$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: MOCK_TOKEN }),
    }),
  )

  // The auth endpoints below are mocked: the browser never reaches the live
  // Java authentication service, so these scenarios verify the frontend flow
  // only and say nothing about real credentials.
  await page.route(/\/api\/v1\/register$/, (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback()
    }

    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ token: MOCK_TOKEN }),
    })
  })

  await page.route(/\/api\/v1\/reset$/, (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback()
    }

    return route.fulfill({ status: 204 })
  })

  await page.route(/\/api\/v1\/change$/, (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback()
    }

    const authorization = route.request().headers().authorization ?? ""

    if (authorization !== `Bearer ${MOCK_TOKEN}`) {
      return fulfillError(route, {
        status: 401,
        message: "invalid or expired token",
      })
    }

    return route.fulfill({ status: 204 })
  })

  await page.route(/\/api\/v1\/clients$/, (route) => {
    const request = route.request()

    if (request.method() === "GET") {
      clientsListRequests += 1

      if (options.listErrorOnce && clientsListRequests === 1) {
        return fulfillError(route, options.listErrorOnce, options.listDelayMs)
      }

      return fulfillList(route, clients, options.listDelayMs)
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
      suppliersListRequests += 1

      if (options.listErrorOnce && suppliersListRequests === 1) {
        return fulfillError(route, options.listErrorOnce, options.listDelayMs)
      }

      return fulfillList(route, suppliers, options.listDelayMs)
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
    const request = route.request()
    const method = request.method()
    const id = supplierIdFromUrl(request.url())

    if (method === "GET") {
      const supplier = suppliers.find((entry) => entry.id === id)

      if (!supplier) {
        return fulfillError(route, {
          status: 404,
          message: "supplier not found",
        })
      }

      return fulfillList(route, supplier)
    }

    if (method !== "DELETE") {
      return route.fallback()
    }

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
    const request = route.request()

    if (request.method() === "GET") {
      productsListRequests += 1

      if (options.productsListError) {
        return fulfillError(route, options.productsListError)
      }

      if (options.listErrorOnce && productsListRequests === 1) {
        return fulfillError(route, options.listErrorOnce, options.listDelayMs)
      }

      return fulfillList(
        route,
        products.filter((product) => (product.available_stock ?? 0) > 0),
        options.listDelayMs,
      )
    }

    if (request.method() === "POST") {
      if (options.createProductError) {
        return fulfillError(route, options.createProductError)
      }

      const body = request.postDataJSON() as {
        name: string
        category: { name: string }
        price: string
        available_stock: number
        supplier_id: string
      }

      const category =
        products.find((product) => product.category?.name === body.category.name)
          ?.category ?? { id: crypto.randomUUID(), name: body.category.name }

      const created: MockProduct = {
        id: crypto.randomUUID(),
        name: body.name,
        category,
        price: body.price,
        available_stock: body.available_stock,
      }

      products.push(created)

      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(created),
      })
    }

    return route.fallback()
  })

  await page.route(/\/api\/v1\/products\/[^/]+\/stock$/, (route) => {
    if (route.request().method() !== "PATCH") {
      return route.fallback()
    }

    const id = productIdFromUrl(route.request().url())
    const body = route.request().postDataJSON() as { amount: number }

    decreaseStockRequests.push({ id, amount: body.amount })

    if (options.decreaseStockError) {
      return fulfillError(route, options.decreaseStockError)
    }

    const product = products.find((entry) => entry.id === id)

    if (!product) {
      return fulfillError(route, { status: 404, message: "product not found" })
    }

    if (body.amount > (product.available_stock ?? 0)) {
      return fulfillError(route, { status: 409, message: "insufficient stock" })
    }

    product.available_stock = (product.available_stock ?? 0) - body.amount

    return route.fulfill({ status: 204 })
  })

  await page.route(/\/api\/v1\/products\/[^/]+$/, (route) => {
    const request = route.request()
    const method = request.method()
    const id = productIdFromUrl(request.url())

    if (method === "GET") {
      const product = products.find((entry) => entry.id === id)

      if (!product) {
        return fulfillError(route, { status: 404, message: "product not found" })
      }

      return fulfillList(route, productFullResponse(product, suppliers[0]))
    }

    if (method !== "DELETE") {
      return route.fallback()
    }

    deleteProductRequests.push(id)

    if (options.deleteProductError) {
      return fulfillError(route, options.deleteProductError)
    }

    const index = products.findIndex((entry) => entry.id === id)

    if (index >= 0) {
      products.splice(index, 1)
    }

    return route.fulfill({ status: 204 })
  })

  await page.route(/\/api\/v1\/products\/[^/]+\/image$/, (route) => {
    const request = route.request()
    const method = request.method()
    const productId = productIdFromUrl(request.url())

    if (method === "GET") {
      const image = [...images.values()].find(
        (entry) => entry.productId === productId,
      )

      if (!image) {
        return fulfillError(route, { status: 404, message: "image not found" })
      }

      return route.fulfill({
        status: 200,
        contentType: "application/octet-stream",
        body: image.bytes,
      })
    }

    if (method === "POST") {
      const product = products.find((entry) => entry.id === productId)

      if (!product) {
        return fulfillError(route, { status: 404, message: "product not found" })
      }

      const bytes = request.postDataBuffer() ?? Buffer.alloc(0)

      if (bytes.length === 0) {
        return fulfillError(route, { status: 400, message: "empty image" })
      }

      const imageId = crypto.randomUUID()
      images.set(imageId, { productId, bytes })
      product.image_id = imageId

      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: imageId }),
      })
    }

    return route.fallback()
  })

  await page.route(/\/api\/v1\/images\/[^/]+$/, (route) => {
    const request = route.request()
    const method = request.method()
    const imageId = imageIdFromUrl(request.url())

    if (method === "PUT") {
      const image = images.get(imageId)

      if (!image) {
        return fulfillError(route, { status: 404, message: "image not found" })
      }

      const bytes = request.postDataBuffer() ?? Buffer.alloc(0)

      if (bytes.length === 0) {
        return fulfillError(route, { status: 400, message: "empty image" })
      }

      image.bytes = bytes

      return route.fulfill({ status: 204 })
    }

    if (method === "DELETE") {
      const image = images.get(imageId)

      if (!image) {
        return fulfillError(route, { status: 404, message: "image not found" })
      }

      images.delete(imageId)

      const product = products.find((entry) => entry.id === image.productId)

      if (product) {
        product.image_id = undefined
      }

      return route.fulfill({ status: 204 })
    }

    return route.fallback()
  })

  return {
    deleteRequests,
    deleteSupplierRequests,
    deleteProductRequests,
    decreaseStockRequests,
    get clientsListRequests() {
      return clientsListRequests
    },
    get productsListRequests() {
      return productsListRequests
    },
    get suppliersListRequests() {
      return suppliersListRequests
    },
  }
}

export async function login(page: Page): Promise<void> {
  await page.goto("/auth/login")
  await page.getByLabel("Email").fill("admin@example.com")
  await page.getByLabel("Password").fill("secret")
  await page.getByRole("button", { name: "Sign In", exact: true }).click()
  await page.waitForURL(/\/clients$/)
}
