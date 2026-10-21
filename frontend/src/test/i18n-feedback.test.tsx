import { describe, expect, it } from "vitest"

import en from "@/shared/i18n/locales/en/common.json"
import ru from "@/shared/i18n/locales/ru/common.json"

const FEEDBACK_KEYS = [
  "retry",
  "retrying",
  "clientCreated",
  "clientDeleted",
  "clientAddressUpdated",
  "supplierCreated",
  "supplierDeleted",
  "supplierAddressUpdated",
  "productCreated",
  "productDeleted",
  "stockDecreased",
] as const

type Locale = typeof en

function collectKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, nested]) =>
    collectKeys(nested, prefix ? `${prefix}.${key}` : key),
  )
}

describe("feedback translations", () => {
  it("keeps the English and Russian key sets in sync", () => {
    expect(collectKeys(ru).sort()).toEqual(collectKeys(en).sort())
  })

  it("defines every feedback key in both locales", () => {
    for (const locale of [en, ru] as Locale[]) {
      for (const key of FEEDBACK_KEYS) {
        expect(locale.feedback).toHaveProperty(key)
        expect(locale.feedback[key]).not.toBe("")
      }
    }
  })
})
