import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { ChangePasswordDialog } from "@/pages/auth/ChangePasswordDialog"
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

function renderDialog() {
  return render(
    <Providers>
      <ChangePasswordDialog open onOpenChange={vi.fn()} />
    </Providers>,
  )
}

async function submitPasswords(
  currentPassword = "old-secret",
  newPassword = "new-secret",
) {
  const user = userEvent.setup()

  await user.type(
    screen.getByLabelText("Current password"),
    currentPassword,
  )
  await user.type(screen.getByLabelText("New password"), newPassword)
  await user.click(screen.getByRole("button", { name: "Change password" }))
}

describe("ChangePasswordDialog", () => {
  let successSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    localStorage.clear()
    postMock.mockReset()
    successSpy = vi.spyOn(toast, "success")

    await act(async () => {
      await i18n.changeLanguage("en")
    })
  })

  afterEach(() => {
    act(() => {
      toast.dismiss()
    })
    successSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it("renders both password fields and the submit button", () => {
    renderDialog()

    expect(screen.getByLabelText("Current password")).toHaveAttribute(
      "type",
      "password",
    )
    expect(screen.getByLabelText("New password")).toHaveAttribute(
      "type",
      "password",
    )
    expect(
      screen.getByRole("button", { name: "Change password" }),
    ).toBeEnabled()
  })

  it("shows validation errors without calling the api", async () => {
    renderDialog()

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Change password" }))

    expect(
      await screen.findByText("Current password is required"),
    ).toBeInTheDocument()
    expect(screen.getByText("New password is required")).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it("sends both passwords and confirms the success", async () => {
    postMock.mockResolvedValue(undefined)
    renderDialog()

    await submitPasswords()

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1))
    expect(postMock).toHaveBeenCalledWith("/change", {
      current_password: "old-secret",
      new_password: "new-secret",
    })
    expect(successSpy).toHaveBeenCalledWith("The password has been changed.")
  })

  it("shows the api message when the current password is wrong", async () => {
    postMock.mockRejectedValue(new ApiError(400, "invalid current password"))
    renderDialog()

    await submitPasswords()

    expect(await screen.findByText("invalid current password")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Change password" }),
    ).toBeInTheDocument()
  })

  it("falls back to 'Invalid current password' on 400 without a message", async () => {
    postMock.mockRejectedValue(new ApiError(400))
    renderDialog()

    await submitPasswords()

    expect(
      await screen.findByText("Invalid current password"),
    ).toBeInTheDocument()
  })

  it("shows the service unavailable message on 502", async () => {
    postMock.mockRejectedValue(new ApiError(502))
    renderDialog()

    await submitPasswords()

    expect(
      await screen.findByText("Authentication service unavailable"),
    ).toBeInTheDocument()
  })

  it("shows a network error message when the request fails without a response", async () => {
    postMock.mockRejectedValue(new NetworkError(new TypeError("Failed to fetch")))
    renderDialog()

    await submitPasswords()

    expect(
      await screen.findByText("Network error. Please try again."),
    ).toBeInTheDocument()
  })

  it("keeps the stored token untouched", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, TOKEN)
    postMock.mockResolvedValue(undefined)
    renderDialog()

    await submitPasswords()

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1))
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe(TOKEN)
  })
})
