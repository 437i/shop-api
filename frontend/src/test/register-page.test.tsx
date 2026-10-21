import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RouterProvider, createMemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { RegisterPage } from "@/pages/auth/RegisterPage"
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

const VALID_FORM = {
  name: "Иван",
  surname: "Иванов",
  email: "ivan@example.ru",
  phone: "+7-999-123-45-67",
  password: "secret1",
}

function renderRegisterPage() {
  const router = createMemoryRouter(
    [
      { path: "/auth/register", element: <RegisterPage /> },
      { path: "/clients", element: <p>Clients page</p> },
    ],
    { initialEntries: ["/auth/register"] },
  )

  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )

  return router
}

async function fillRegisterForm(values: Partial<typeof VALID_FORM> = {}) {
  const user = userEvent.setup()
  const form = { ...VALID_FORM, ...values }

  await user.type(screen.getByLabelText("Name"), form.name)
  await user.type(screen.getByLabelText("Surname"), form.surname)
  await user.type(screen.getByLabelText("Email"), form.email)
  await user.type(screen.getByLabelText("Phone"), form.phone)
  await user.type(screen.getByLabelText("Password"), form.password)
  await user.click(screen.getByRole("button", { name: "Sign Up" }))
}

describe("RegisterPage", () => {
  beforeEach(async () => {
    localStorage.clear()
    postMock.mockReset()

    await act(async () => {
      await i18n.changeLanguage("en")
    })
  })

  it("renders every field and the submit button", () => {
    renderRegisterPage()

    expect(screen.getByLabelText("Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Surname")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
    expect(screen.getByLabelText("Phone")).toHaveAttribute("type", "tel")
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password")
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeEnabled()
  })

  it("shows validation errors without calling the API", async () => {
    renderRegisterPage()

    await userEvent.setup().click(screen.getByRole("button", { name: "Sign Up" }))

    expect(await screen.findByText("Name is required")).toBeInTheDocument()
    expect(screen.getByText("Surname is required")).toBeInTheDocument()
    expect(screen.getByText("Email is required")).toBeInTheDocument()
    expect(screen.getByText("Phone is required")).toBeInTheDocument()
    expect(screen.getByText("Password is required")).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it("shows a validation error for an unsupported email domain", async () => {
    renderRegisterPage()

    await fillRegisterForm({ email: "ivan@example.io" })

    expect(
      await screen.findByText("Enter a valid email in the .ru or .com domain"),
    ).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it("disables the submit button and shows the pending label while sending", async () => {
    let resolveRequest: ((value: { token: string }) => void) | undefined
    postMock.mockImplementation(
      () =>
        new Promise<{ token: string }>((resolve) => {
          resolveRequest = resolve
        }),
    )
    renderRegisterPage()

    const user = userEvent.setup()
    await user.type(screen.getByLabelText("Name"), VALID_FORM.name)
    await user.type(screen.getByLabelText("Surname"), VALID_FORM.surname)
    await user.type(screen.getByLabelText("Email"), VALID_FORM.email)
    await user.type(screen.getByLabelText("Phone"), VALID_FORM.phone)
    await user.type(screen.getByLabelText("Password"), VALID_FORM.password)
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    const button = await screen.findByRole("button", { name: "Signing up..." })
    expect(button).toBeDisabled()

    await act(async () => {
      resolveRequest?.({ token: TOKEN })
    })
  })

  it("saves the token and redirects to /clients on a successful registration", async () => {
    postMock.mockResolvedValue({ token: TOKEN })
    const router = renderRegisterPage()

    await fillRegisterForm()

    await waitFor(() => expect(router.state.location.pathname).toBe("/clients"))
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe(TOKEN)
    expect(screen.getByText("Clients page")).toBeInTheDocument()
    expect(postMock).toHaveBeenCalledWith("/register", VALID_FORM)
  })

  const missingTokenCases: Array<[string, { token?: string }]> = [
    ["missing", {}],
    ["empty", { token: "" }],
  ]

  it.each(missingTokenCases)(
    "shows an error when the response token is %s",
    async (_label, response) => {
      postMock.mockResolvedValue(response)
      const router = renderRegisterPage()

      await fillRegisterForm()

      expect(
        await screen.findByText("Authentication failed: no token received"),
      ).toBeInTheDocument()
      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
      expect(router.state.location.pathname).toBe("/auth/register")
    },
  )

  it("shows the API message when registration fails with 409", async () => {
    postMock.mockRejectedValue(new ApiError(409, "user already exists"))
    renderRegisterPage()

    await fillRegisterForm()

    expect(await screen.findByText("user already exists")).toBeInTheDocument()
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it("falls back to 'User already exists' on 409 without a message", async () => {
    postMock.mockRejectedValue(new ApiError(409))
    renderRegisterPage()

    await fillRegisterForm()

    expect(await screen.findByText("User already exists")).toBeInTheDocument()
  })

  it("shows the API message when registration fails with 400", async () => {
    postMock.mockRejectedValue(new ApiError(400, "invalid data"))
    renderRegisterPage()

    await fillRegisterForm()

    expect(await screen.findByText("invalid data")).toBeInTheDocument()
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it("falls back to 'Invalid request' on 400 without a message", async () => {
    postMock.mockRejectedValue(new ApiError(400))
    renderRegisterPage()

    await fillRegisterForm()

    expect(await screen.findByText("Invalid request")).toBeInTheDocument()
  })

  it("shows the service unavailable message on 502", async () => {
    postMock.mockRejectedValue(new ApiError(502))
    renderRegisterPage()

    await fillRegisterForm()

    expect(
      await screen.findByText("Authentication service unavailable"),
    ).toBeInTheDocument()
  })

  it("shows a network error message when the request fails without a response", async () => {
    postMock.mockRejectedValue(new NetworkError(new TypeError("Failed to fetch")))
    renderRegisterPage()

    await fillRegisterForm()

    expect(
      await screen.findByText("Network error. Please try again."),
    ).toBeInTheDocument()
  })

  it("redirects an authorized user to /clients without showing the form", () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    const router = renderRegisterPage()

    expect(router.state.location.pathname).toBe("/clients")
    expect(screen.getByText("Clients page")).toBeInTheDocument()
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument()
  })
})
