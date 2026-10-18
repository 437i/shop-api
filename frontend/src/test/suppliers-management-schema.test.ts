import { describe, expect, it } from "vitest"

import {
  normalizePhone,
  resolvePhoneError,
  supplierFormSchema,
} from "@/pages/suppliers/supplierFormSchema"
import type { SupplierFormValues } from "@/pages/suppliers/supplierFormSchema"

const VALID_VALUES: SupplierFormValues = {
  name: "ООО Моя Оборона",
  phone: "+7 (999) 123-45-67",
  address: {
    country: "Russia",
    city: "Moscow",
    street: "Tverskaya 1",
  },
}

const LONG_VALUE = "a".repeat(256)

function issueFor(values: unknown, path: string): string | undefined {
  const result = supplierFormSchema.safeParse(values)

  if (result.success) {
    return undefined
  }

  return result.error.issues.find(
    (issue) => issue.path.join(".") === path,
  )?.message
}

function expectIssue(values: unknown, path: string, message: string) {
  expect(issueFor(values, path)).toBe(message)
}

describe("supplierFormSchema", () => {
  it("accepts valid values", () => {
    expect(supplierFormSchema.safeParse(VALID_VALUES).success).toBe(true)
  })

  it.each([
    ["name", { ...VALID_VALUES, name: "" }, "suppliers.validation.nameRequired"],
    [
      "phone",
      { ...VALID_VALUES, phone: "" },
      "suppliers.validation.phoneRequired",
    ],
    [
      "address.country",
      { ...VALID_VALUES, address: { ...VALID_VALUES.address, country: "" } },
      "suppliers.validation.countryRequired",
    ],
    [
      "address.city",
      { ...VALID_VALUES, address: { ...VALID_VALUES.address, city: "" } },
      "suppliers.validation.cityRequired",
    ],
    [
      "address.street",
      { ...VALID_VALUES, address: { ...VALID_VALUES.address, street: "" } },
      "suppliers.validation.streetRequired",
    ],
  ])("rejects an empty required field: %s", (path, values, message) => {
    expectIssue(values, path, message)
  })

  it.each([
    ["name", { name: LONG_VALUE }, "suppliers.validation.nameMax"],
    [
      "address.country",
      { address: { ...VALID_VALUES.address, country: LONG_VALUE } },
      "suppliers.validation.countryMax",
    ],
    [
      "address.city",
      { address: { ...VALID_VALUES.address, city: LONG_VALUE } },
      "suppliers.validation.cityMax",
    ],
    [
      "address.street",
      { address: { ...VALID_VALUES.address, street: LONG_VALUE } },
      "suppliers.validation.streetMax",
    ],
  ])("rejects 256 characters in %s", (path, overrides, message) => {
    expectIssue({ ...VALID_VALUES, ...overrides }, path, message)
  })

  it("accepts values of exactly 255 characters", () => {
    const value = "a".repeat(255)

    const result = supplierFormSchema.safeParse({
      ...VALID_VALUES,
      name: value,
      address: { country: value, city: value, street: value },
    })

    expect(result.success).toBe(true)
  })

  it("does not transform the submitted object", () => {
    const result = supplierFormSchema.safeParse(VALID_VALUES)

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data).toEqual(VALID_VALUES)
    }
  })

  it.each(["+7 (999) 123-45-67", "+7 999 123 45 67", "+79991234567"])(
    "keeps the submitted phone value unchanged: %s",
    (phone) => {
      const result = supplierFormSchema.safeParse({ ...VALID_VALUES, phone })

      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.phone).toBe(phone)
      }
    },
  )
})

describe("phone validation in supplierFormSchema", () => {
  it.each([
    ["+7 (999) 123-45-67", null],
    ["89991234567", "suppliers.validation.phoneInvalid"],
    ["not-a-phone", "suppliers.validation.phoneInvalid"],
    ["+12345678", null],
    ["+123456789012345", null],
    ["+1234567", "suppliers.validation.phoneInvalid"],
    ["+1234567890123456", "suppliers.validation.phoneInvalid"],
    ["+012345678", "suppliers.validation.phoneInvalid"],
  ] as const)("validates %s after normalization", (phone, expected) => {
    if (expected === null) {
      expect(issueFor({ ...VALID_VALUES, phone }, "phone")).toBeUndefined()

      return
    }

    expectIssue({ ...VALID_VALUES, phone }, "phone", expected)
  })
})

describe("normalizePhone", () => {
  it.each([
    ["+7 (999) 123-45-67", "+79991234567"],
    ["8 999 123 45 67", "89991234567"],
    ["+1+2", "+12"],
    ["12+34", "1234"],
    ["+", "+"],
    ["", ""],
  ])("normalizes %s to %s", (value, expected) => {
    expect(normalizePhone(value)).toBe(expected)
  })

  it("preserves the leading plus only at position zero", () => {
    expect(normalizePhone("++79991234567")).toBe("+79991234567")
  })
})

describe("resolvePhoneError", () => {
  it.each([
    ["+7 (999) 123-45-67", null],
    ["+79991234567", null],
    ["89991234567", "suppliers.validation.phoneInvalid"],
    ["not-a-phone", "suppliers.validation.phoneInvalid"],
    ["", "suppliers.validation.phoneInvalid"],
  ])("resolves %s to %s", (value, expected) => {
    expect(resolvePhoneError(value)).toBe(expected)
  })
})
