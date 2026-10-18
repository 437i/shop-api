import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nextProvider } from "react-i18next"
import { RouterProvider, createMemoryRouter } from "react-router"
import { beforeEach, describe, expect, it } from "vitest"

import { AdminLayout } from "@/app/AdminLayout"
import { AUTH_TOKEN_STORAGE_KEY } from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

const TOKEN = "jwt-token"

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
    await i18n.changeLanguage("en")
  })

  it("renders Clients active, Suppliers as a link and Products disabled", () => {
    renderLayout()

    const clientsLink = screen.getByRole("link", { name: "Clients" })
    expect(clientsLink).toHaveAttribute("href", "/clients")
    expect(clientsLink).toHaveAttribute("data-active")

    const suppliersLink = screen.getByRole("link", { name: "Suppliers" })
    expect(suppliersLink).toHaveAttribute("href", "/suppliers")
    expect(suppliersLink).not.toHaveAttribute("data-active")

    expect(screen.getByRole("button", { name: "Products" })).toBeDisabled()
    expect(screen.getByText("Clients content")).toBeInTheDocument()
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

  it("does not navigate when a disabled menu item is clicked", async () => {
    const user = userEvent.setup()
    const { router } = renderLayout()

    await user.click(screen.getByRole("button", { name: "Products" }))

    expect(router.state.location.pathname).toBe("/clients")
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
})
