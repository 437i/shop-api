import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RouterProvider, createMemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { LoginPage } from "@/pages/auth/LoginPage"
import { loginSchema } from "@/pages/auth/loginSchema"
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

const TOKEN = "jwt-token"

const postMock = vi.mocked(apiClient.post)

function renderLoginPage() {
  const router = createMemoryRouter(
    [
      { path: "/auth/login", element: <LoginPage /> },
      { path: "/clients", element: <p>Clients page</p> },
    ],
    { initialEntries: ["/auth/login"] },
  )

  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )

  return router
}

async function submitCredentials(
  email: string,
  password: string,
  submitLabel = "Sign In",
) {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText("Email"), email)
  await user.type(screen.getByLabelText("Password"), password)
  await user.click(screen.getByRole("button", { name: submitLabel }))
}

function firstIssueMessage(values: { email: string; password: string }) {
  const result = loginSchema.safeParse(values)

  return result.success ? undefined : result.error.issues[0]?.message
}

describe("loginSchema", () => {
  it("requires an email", () => {
    expect(firstIssueMessage({ email: "", password: "secret" })).toBe(
      "validation.emailRequired",
    )
  })

  it("rejects an invalid email", () => {
    expect(firstIssueMessage({ email: "notanemail", password: "secret" })).toBe(
      "validation.invalidEmail",
    )
  })

  it("requires a password", () => {
    expect(
      firstIssueMessage({ email: "user@example.com", password: "" }),
    ).toBe("validation.passwordRequired")
  })

  it("accepts valid credentials", () => {
    expect(
      loginSchema.safeParse({ email: "user@example.com", password: "secret" })
        .success,
    ).toBe(true)
  })
})

describe("LoginPage", () => {
  beforeEach(async () => {
    localStorage.clear()
    postMock.mockReset()

    await act(async () => {
      await i18n.changeLanguage("en")
    })
  })

  it("renders the email and password fields and the submit button", () => {
    renderLoginPage()

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password")
    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled()
  })

  it("shows validation errors for empty fields without calling the API", async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.click(screen.getByRole("button", { name: "Sign In" }))

    expect(await screen.findByText("Email is required")).toBeInTheDocument()
    expect(screen.getByText("Password is required")).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it("shows a validation error for an invalid email without calling the API", async () => {
    renderLoginPage()

    await submitCredentials("notanemail", "secret")

    expect(await screen.findByText("Invalid email format")).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it("saves the token and redirects to /clients on a successful login", async () => {
    postMock.mockResolvedValue({ token: TOKEN })
    const router = renderLoginPage()

    await submitCredentials("user@example.com", "secret")

    await waitFor(() => expect(router.state.location.pathname).toBe("/clients"))
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe(TOKEN)
    expect(screen.getByText("Clients page")).toBeInTheDocument()
    expect(postMock).toHaveBeenCalledWith("/auth", {
      email: "user@example.com",
      password: "secret",
    })
  })

  const missingTokenCases: Array<[string, { token?: string }]> = [
    ["missing", {}],
    ["empty", { token: "" }],
  ]

  it.each(missingTokenCases)(
    "shows an error when the response token is %s",
    async (_label, response) => {
      postMock.mockResolvedValue(response)
      const router = renderLoginPage()

      await submitCredentials("user@example.com", "secret")

      expect(
        await screen.findByText("Authentication failed: no token received"),
      ).toBeInTheDocument()
      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
      expect(router.state.location.pathname).toBe("/auth/login")
    },
  )

  it("shows the API message when login fails with 400", async () => {
    postMock.mockRejectedValue(new ApiError(400, "bad credentials"))
    renderLoginPage()

    await submitCredentials("user@example.com", "secret")

    expect(await screen.findByText("bad credentials")).toBeInTheDocument()
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it("falls back to 'Invalid credentials' on 400 without a message", async () => {
    postMock.mockRejectedValue(new ApiError(400))
    renderLoginPage()

    await submitCredentials("user@example.com", "secret")

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument()
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it("shows the API message when login fails with 502", async () => {
    postMock.mockRejectedValue(new ApiError(502, "auth service error"))
    renderLoginPage()

    await submitCredentials("user@example.com", "secret")

    expect(await screen.findByText("auth service error")).toBeInTheDocument()
  })

  it("falls back to 'Authentication service unavailable' on 502 without a message", async () => {
    postMock.mockRejectedValue(new ApiError(502))
    renderLoginPage()

    await submitCredentials("user@example.com", "secret")

    expect(
      await screen.findByText("Authentication service unavailable"),
    ).toBeInTheDocument()
  })

  it("shows a network error message when the request fails without a response", async () => {
    postMock.mockRejectedValue(new NetworkError())
    renderLoginPage()

    await submitCredentials("user@example.com", "secret")

    expect(
      await screen.findByText("Network error. Please try again."),
    ).toBeInTheDocument()
  })

  it("disables the submit button and shows the pending label while signing in", async () => {
    let resolveRequest: (value: { token: string }) => void = () => {}
    postMock.mockReturnValue(
      new Promise<{ token: string }>((resolve) => {
        resolveRequest = resolve
      }),
    )
    renderLoginPage()

    await submitCredentials("user@example.com", "secret")

    expect(
      await screen.findByRole("button", { name: "Signing in..." }),
    ).toBeDisabled()

    await act(async () => {
      resolveRequest({ token: TOKEN })
    })

    await waitFor(() =>
      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe(TOKEN),
    )
  })

  it("redirects an authenticated user to /clients without showing the form", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    renderLoginPage()

    expect(await screen.findByText("Clients page")).toBeInTheDocument()
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument()
  })

  it("renders the form and validation errors in Russian when the language is ru", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    const user = userEvent.setup()
    renderLoginPage()

    expect(screen.getByLabelText("Пароль")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Войти" }))

    expect(await screen.findByText("Укажите email")).toBeInTheDocument()
    expect(screen.getByText("Укажите пароль")).toBeInTheDocument()
  })

  it("localizes API error fallbacks", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })
    postMock.mockRejectedValue(new ApiError(400))
    renderLoginPage()

    const user = userEvent.setup()
    await user.type(screen.getByLabelText("Email"), "user@example.com")
    await user.type(screen.getByLabelText("Пароль"), "secret")
    await user.click(screen.getByRole("button", { name: "Войти" }))

    expect(
      await screen.findByText("Неверные учётные данные"),
    ).toBeInTheDocument()
  })
})
