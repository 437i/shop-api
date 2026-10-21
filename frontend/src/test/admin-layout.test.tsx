import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nextProvider } from "react-i18next"
import { RouterProvider, createMemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AdminLayout } from "@/app/AdminLayout"
import { AUTH_TOKEN_STORAGE_KEY, apiClient } from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

vi.mock("@/shared/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/client")>()

  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      post: vi.fn(),
    },
  }
})

const TOKEN = "jwt-token"

const postMock = vi.mocked(apiClient.post)

function renderLayout(initialPath = "/clients") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(["cached-clients"], [{ id: 1 }])

  const router = createMemoryRouter(
    [
      {
        path: "/clients",
        element: (
          <AdminLayout>
            <p>Clients content</p>
          </AdminLayout>
        ),
      },
      {
        path: "/products",
        element: (
          <AdminLayout>
            <p>Products content</p>
          </AdminLayout>
        ),
      },
      {
        path: "/suppliers",
        element: (
          <AdminLayout>
            <p>Suppliers content</p>
          </AdminLayout>
        ),
      },
      { path: "/auth/login", element: <p>Login page</p> },
    ],
    { initialEntries: [initialPath] },
  )

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { router, queryClient }
}

describe("AdminLayout", () => {
  beforeEach(async () => {
    localStorage.clear()
    postMock.mockReset()
    await i18n.changeLanguage("en")
  })

  it("renders Clients active and Products and Suppliers as links", () => {
    renderLayout()

    const clientsLink = screen.getByRole("link", { name: "Clients" })
    expect(clientsLink).toHaveAttribute("href", "/clients")
    expect(clientsLink).toHaveAttribute("data-active")

    const productsLink = screen.getByRole("link", { name: "Products" })
    expect(productsLink).toHaveAttribute("href", "/products")
    expect(productsLink).not.toHaveAttribute("data-active")

    const suppliersLink = screen.getByRole("link", { name: "Suppliers" })
    expect(suppliersLink).toHaveAttribute("href", "/suppliers")
    expect(suppliersLink).not.toHaveAttribute("data-active")

    expect(screen.getByText("Clients content")).toBeInTheDocument()
  })

  it("marks Products active when the route is /products", () => {
    renderLayout("/products")

    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute(
      "data-active",
    )
    expect(screen.getByRole("link", { name: "Clients" })).not.toHaveAttribute(
      "data-active",
    )
    expect(screen.getByText("Products content")).toBeInTheDocument()
  })

  it("marks Suppliers active when the route is /suppliers", () => {
    renderLayout("/suppliers")

    expect(screen.getByRole("link", { name: "Suppliers" })).toHaveAttribute(
      "data-active",
    )
    expect(screen.getByRole("link", { name: "Clients" })).not.toHaveAttribute(
      "data-active",
    )
    expect(screen.getByText("Suppliers content")).toBeInTheDocument()
  })

  it("navigates to /suppliers when the Suppliers menu item is clicked", async () => {
    const user = userEvent.setup()
    const { router } = renderLayout()

    await user.click(screen.getByRole("link", { name: "Suppliers" }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/suppliers"),
    )
    expect(screen.getByText("Suppliers content")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Suppliers" })).toHaveAttribute(
      "data-active",
    )
    expect(screen.getByRole("link", { name: "Clients" })).not.toHaveAttribute(
      "data-active",
    )
  })

  it("navigates to /products when the Products menu item is clicked", async () => {
    const user = userEvent.setup()
    const { router } = renderLayout()

    await user.click(screen.getByRole("link", { name: "Products" }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/products"),
    )
    expect(screen.getByText("Products content")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute(
      "data-active",
    )
    expect(screen.getByRole("link", { name: "Clients" })).not.toHaveAttribute(
      "data-active",
    )
  })

  it("switches the interface language between EN and RU", async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(
      screen.getByRole("button", { name: "Switch language: EN" }),
    )

    expect(
      await screen.findByRole("button", { name: "Переключить язык: RU" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Клиенты" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Выйти" })).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Переключить язык: RU" }),
    )

    expect(
      await screen.findByRole("button", { name: "Switch language: EN" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Clients" })).toBeInTheDocument()
  })

  it("logs out: clears the token, clears the query cache and redirects to login", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    const user = userEvent.setup()
    const { router, queryClient } = renderLayout()

    await user.click(screen.getByRole("button", { name: "Logout" }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/auth/login"),
    )
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(queryClient.getQueryData(["cached-clients"])).toBeUndefined()
    expect(screen.getByText("Login page")).toBeInTheDocument()
  })

  it("opens the change password dialog from the sidebar footer", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole("button", { name: "Change password" }))

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByLabelText("Current password")).toBeInTheDocument()
    expect(screen.getByLabelText("New password")).toBeInTheDocument()
  })

  it("keeps the session and the current section after a successful password change", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    postMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    const { router } = renderLayout("/products")

    await user.click(screen.getByRole("button", { name: "Change password" }))
    await user.type(
      await screen.findByLabelText("Current password"),
      "old-secret",
    )
    await user.type(screen.getByLabelText("New password"), "new-secret")
    await user.click(screen.getByRole("button", { name: "Change password" }))

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1))
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe(TOKEN)
    expect(router.state.location.pathname).toBe("/products")
    expect(screen.getByText("Products content")).toBeInTheDocument()
  })
})
