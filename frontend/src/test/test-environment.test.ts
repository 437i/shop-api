import { describe, expect, it } from "vitest"

describe("Vitest environment", () => {
  it("provides a browser-like DOM", () => {
    const element = document.createElement("div")

    expect(element).toBeInstanceOf(HTMLElement)
  })
})