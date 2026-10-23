import { render, screen, waitFor } from "@testing-library/react"
import { RouterProvider, createMemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ProtectedRoute } from "@/app/ProtectedRoute"
import { Providers } from "@/app/providers"
import { routes } from "@/app/router"
import { AUTH_TOKEN_STORAGE_KEY } from "@/shared/api/client"

const TOKEN = "test-token"

const CARD_FIXTURE = {
  id: "1",
  name: "Liebherr CNel 4313",
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

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function renderApp(initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("redirects to the login page when no token is stored", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/secret",
          element: (
            <ProtectedRoute>
              <p>Protected content</p>
            </ProtectedRoute>
          ),
        },
        { path: "/auth/login", element: <p>Login page</p> },
      ],
      { initialEntries: ["/secret"] },
    )

    render(<RouterProvider router={router} />)

    expect(await screen.findByText("Login page")).toBeInTheDocument()
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument()
  })

  it("renders children when a token is stored", () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)

    const router = createMemoryRouter(
      [
        {
          path: "/secret",
          element: (
            <ProtectedRoute>
              <p>Protected content</p>
            </ProtectedRoute>
          ),
        },
      ],
      { initialEntries: ["/secret"] },
    )

    render(<RouterProvider router={router} />)

    expect(screen.getByText("Protected content")).toBeInTheDocument()
  })
})

describe("router", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("redirects unauthenticated access to /clients to the login page", async () => {
    const router = renderApp("/clients")

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/auth/login"),
    )
    expect(
      await screen.findByRole("button", { name: "Sign In" }),
    ).toBeInTheDocument()
  })

  it("redirects unauthenticated access to /products/:id to the login page", async () => {
    const router = renderApp("/products/1")

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/auth/login"),
    )
    expect(
      await screen.findByRole("button", { name: "Sign In" }),
    ).toBeInTheDocument()
  })

  it("keeps authenticated access to /products/:id and renders the product card inside the admin layout", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input, init) => {
      if (init?.method && init.method !== "GET") {
        return Promise.reject(new Error(`Unexpected ${init.method} request`))
      }

      const url = String(input)

      if (url === "/api/v1/products/1") {
        return Promise.resolve(jsonResponse(200, CARD_FIXTURE))
      }

      if (url === "/api/v1/products/1/image") {
        return Promise.resolve(jsonResponse(404, { message: "image not found" }))
      }

      if (url === "/api/v1/products") {
        return Promise.resolve(jsonResponse(200, []))
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
    vi.stubGlobal("fetch", fetchMock)

    const router = renderApp("/products/1")

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/products/1"),
    )
    expect(
      await screen.findByText("Liebherr CNel 4313"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Back to products" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Products" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Clients" })).toBeInTheDocument()
  })

  it("keeps authenticated access to /clients and renders the admin layout", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    const router = renderApp("/clients")

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/clients"),
    )
    expect(
      await screen.findByRole("link", { name: "Clients" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Clients" })).toHaveAttribute(
      "data-active",
    )
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute(
      "href",
      "/products",
    )
    expect(screen.getByRole("link", { name: "Suppliers" })).toHaveAttribute(
      "href",
      "/suppliers",
    )
    expect(
      screen.getByRole("button", { name: "Logout" }),
    ).toBeInTheDocument()
  })

  it("keeps authenticated access to /suppliers and renders the admin layout", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    const router = renderApp("/suppliers")

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/suppliers"),
    )
    expect(
      await screen.findByRole("heading", { name: "Suppliers" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Suppliers" })).toHaveAttribute(
      "data-active",
    )
    expect(screen.getByRole("link", { name: "Clients" })).not.toHaveAttribute(
      "data-active",
    )
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute(
      "href",
      "/products",
    )
  })

  it("keeps authenticated access to /products and renders the page heading", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    const router = renderApp("/products")

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/products"),
    )
    expect(
      await screen.findByRole("heading", { name: "Products" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute(
      "data-active",
    )
    expect(screen.getByRole("link", { name: "Clients" })).not.toHaveAttribute(
      "data-active",
    )
  })

  it("redirects the root path to /clients", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    const router = renderApp("/")

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/clients"),
    )
  })

  it("renders the not found page for unknown routes", () => {
    const router = renderApp("/nonexistent")

    expect(router.state.location.pathname).toBe("/nonexistent")
    expect(screen.getByText("404: Page Not Found")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Back to home" }),
    ).toHaveAttribute("href", "/")
  })
})
