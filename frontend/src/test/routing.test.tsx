import { render, screen, waitFor } from "@testing-library/react"
import { RouterProvider, createMemoryRouter } from "react-router"
import { beforeEach, describe, expect, it } from "vitest"

import { ProtectedRoute } from "@/app/ProtectedRoute"
import { routes } from "@/app/router"
import { AUTH_TOKEN_STORAGE_KEY } from "@/shared/api/client"

const TOKEN = "test-token"

function renderApp(initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  render(<RouterProvider router={router} />)
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

  it("redirects unauthenticated access to /clients to the login page", async () => {
    const router = renderApp("/clients")

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/auth/login"),
    )
  })

  it("keeps authenticated access to /clients", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    const router = renderApp("/clients")

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/clients"),
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
