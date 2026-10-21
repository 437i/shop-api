import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RouterProvider, createMemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage"
import { resetPasswordSchema } from "@/pages/auth/resetPasswordSchema"
import {
  AUTH_TOKEN_STORAGE_KEY,
  ApiError,
  NetworkError,
  apiClient,
} from "@/shared/api/client"
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

const postMock = vi.mocked(apiClient.post)

function renderResetPasswordPage() {
  const router = createMemoryRouter(
    [
      { path: "/auth/reset", element: <ResetPasswordPage /> },
      { path: "/auth/login", element: <p>Login page</p> },
      { path: "/clients", element: <p>Clients page</p> },
    ],
    { initialEntries: ["/auth/reset"] },
  )

  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )

  return router
}

async function submitEmail(email: string) {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText("Email"), email)
  await user.click(screen.getByRole("button", { name: "Reset password" }))
}

describe("resetPasswordSchema", () => {
  it("requires an email", () => {
    const result = resetPasswordSchema.safeParse({ email: "" })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(
      "auth.validation.emailRequired",
    )
  })

  it("accepts any non-empty email because the auth service only rejects a blank one", () => {
    const result = resetPasswordSchema.safeParse({ email: "user@example.com" })

    expect(result.success).toBe(true)
  })
})

describe("ResetPasswordPage", () => {
  beforeEach(async () => {
    localStorage.clear()
    postMock.mockReset()

    await act(async () => {
      await i18n.changeLanguage("en")
    })
  })

  it("renders the email field and the submit button", () => {
    renderResetPasswordPage()

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
    expect(screen.getByRole("button", { name: "Reset password" })).toBeEnabled()
  })

  it("shows a validation error without calling the API", async () => {
    renderResetPasswordPage()

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Reset password" }))

    expect(await screen.findByText("Email is required")).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it("shows where the new password is written and warns that the current one stopped working", async () => {
    postMock.mockResolvedValue(undefined)
    renderResetPasswordPage()

    await submitEmail("user@example.com")

    expect(
      await screen.findByText(
        "The password has been reset. The new password is written to the authentication service log.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "The current password no longer works. Sign in with the new password from the log.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Reset password" }),
    ).not.toBeInTheDocument()
  })

  it("keeps the link back to the login page after a successful reset", async () => {
    postMock.mockResolvedValue(undefined)
    const router = renderResetPasswordPage()

    await submitEmail("user@example.com")

    const link = await screen.findByRole("link", { name: "Back to sign in" })
    expect(link).toHaveAttribute("href", "/auth/login")

    await userEvent.setup().click(link)

    expect(router.state.location.pathname).toBe("/auth/login")
    expect(screen.getByText("Login page")).toBeInTheDocument()
  })

  it("gives the same result for an unknown email because the api answers 204 either way", async () => {
    postMock.mockResolvedValue(undefined)
    renderResetPasswordPage()

    await submitEmail("unknown@example.com")

    expect(
      await screen.findByText(
        "The password has been reset. The new password is written to the authentication service log.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "The current password no longer works. Sign in with the new password from the log.",
      ),
    ).toBeInTheDocument()
    expect(postMock).toHaveBeenCalledWith("/reset", { email: "unknown@example.com" })
  })

  it("disables the submit button and shows the pending label while sending", async () => {
    let resolveRequest: (() => void) | undefined
    postMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve
        }),
    )
    renderResetPasswordPage()

    const user = userEvent.setup()
    await user.type(screen.getByLabelText("Email"), "user@example.com")
    await user.click(screen.getByRole("button", { name: "Reset password" }))

    const button = await screen.findByRole("button", { name: "Resetting..." })
    expect(button).toBeDisabled()

    await act(async () => {
      resolveRequest?.()
    })
  })

  it("shows the API message when the reset fails with 400", async () => {
    postMock.mockRejectedValue(new ApiError(400, "invalid request body"))
    renderResetPasswordPage()

    await submitEmail("user@example.com")

    expect(await screen.findByText("invalid request body")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Reset password" }),
    ).toBeInTheDocument()
  })

  it("falls back to 'Invalid request' on 400 without a message", async () => {
    postMock.mockRejectedValue(new ApiError(400))
    renderResetPasswordPage()

    await submitEmail("user@example.com")

    expect(await screen.findByText("Invalid request")).toBeInTheDocument()
  })

  it("shows the service unavailable message on 502", async () => {
    postMock.mockRejectedValue(new ApiError(502))
    renderResetPasswordPage()

    await submitEmail("user@example.com")

    expect(
      await screen.findByText("Authentication service unavailable"),
    ).toBeInTheDocument()
  })

  it("shows a network error message when the request fails without a response", async () => {
    postMock.mockRejectedValue(new NetworkError(new TypeError("Failed to fetch")))
    renderResetPasswordPage()

    await submitEmail("user@example.com")

    expect(
      await screen.findByText("Network error. Please try again."),
    ).toBeInTheDocument()
  })

  it("redirects an authorized user to /clients without showing the form", () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "jwt-token")
    const router = renderResetPasswordPage()

    expect(router.state.location.pathname).toBe("/clients")
    expect(screen.getByText("Clients page")).toBeInTheDocument()
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument()
  })
})
