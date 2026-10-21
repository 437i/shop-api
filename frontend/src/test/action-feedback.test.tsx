import { act, render, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { notifySuccess } from "@/shared/feedback/notifications"
import i18n from "@/shared/i18n/config"

describe("action feedback", () => {
  let successSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    localStorage.clear()
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

  it("shows a single success notification with the translated text", () => {
    notifySuccess("feedback.clientCreated")

    expect(successSpy).toHaveBeenCalledTimes(1)
    expect(successSpy).toHaveBeenCalledWith("Client created")
  })

  it("shows the notification text in the selected interface language", async () => {
    await act(async () => {
      await i18n.changeLanguage("ru")
    })

    notifySuccess("feedback.clientCreated")

    expect(successSpy).toHaveBeenCalledWith("Клиент создан")
  })

  it("mounts a single notification container in the application providers", async () => {
    render(
      <Providers>
        <div>panel</div>
      </Providers>,
    )

    await act(async () => {
      notifySuccess("feedback.clientCreated")
    })

    await waitFor(() => {
      expect(document.querySelectorAll("[data-sonner-toaster]")).toHaveLength(1)
    })
    expect(await screen.findByText("Client created")).toBeInTheDocument()
  })
})
