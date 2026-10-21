import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { act } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { RetryableErrorAlert } from "@/shared/feedback/RetryableErrorAlert"
import i18n from "@/shared/i18n/config"

const ERROR_MESSAGE = "Server error. Please try again later."

function renderAlert(options: { isRetrying?: boolean } = {}) {
  const onRetry = vi.fn()

  const view = render(
    <I18nextProvider i18n={i18n}>
      <RetryableErrorAlert
        message={ERROR_MESSAGE}
        onRetry={onRetry}
        isRetrying={options.isRetrying}
      />
    </I18nextProvider>,
  )

  return { ...view, onRetry }
}

describe("RetryableErrorAlert", () => {
  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage("en")
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows the error message and the retry action", () => {
    renderAlert()

    expect(screen.getByText(ERROR_MESSAGE)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
  })

  it("calls the retry callback when the action is activated", async () => {
    const user = userEvent.setup()
    const { onRetry } = renderAlert()

    await user.click(screen.getByRole("button", { name: "Retry" }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("disables the action and reports the running retry", () => {
    renderAlert({ isRetrying: true })

    const button = screen.getByRole("button", { name: "Retrying" })

    expect(button).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
  })

  it("renders the action as its own row instead of the alert-action slot", () => {
    const { container } = renderAlert()

    const alert = container.querySelector('[data-slot="alert"]')
    const button = screen.getByRole("button", { name: "Retry" })

    expect(alert).not.toBeNull()
    expect(alert?.querySelector('[data-slot="alert-action"]')).toBeNull()
    expect(button.closest('[data-slot="alert-action"]')).toBeNull()
    expect(button.parentElement).toBe(alert)
  })

  it("renders the action labels in the selected interface language", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })

    renderAlert()

    expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument()
  })

  it("renders the running retry label in the selected interface language", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })

    renderAlert({ isRetrying: true })

    expect(screen.getByRole("button", { name: "Повторная загрузка" })).toBeInTheDocument()
  })
})
