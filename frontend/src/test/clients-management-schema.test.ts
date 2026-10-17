import { afterEach, describe, expect, it, vi } from "vitest"

import {
  clientAddressSchema,
  clientFormSchema,
  createClientFormSchema,
  resolveBirthdayError,
} from "@/pages/clients/clientFormSchema"
import type { ClientFormValues } from "@/pages/clients/clientFormSchema"

const TODAY = new Date(2026, 9, 16)

const VALID_VALUES: ClientFormValues = {
  name: "Ivan",
  surname: "Ivanov",
  birthday: "1986-09-12",
  gender: "m",
  address: {
    country: "Russia",
    city: "Moscow",
    street: "Tverskaya 1",
  },
}

const LONG_VALUE = "a".repeat(256)

function issueFor(values: unknown, path: string): string | undefined {
  const result = clientFormSchema.safeParse(values)

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

afterEach(() => {
  vi.useRealTimers()
})

describe("clientFormSchema", () => {
  it("accepts valid values", () => {
    expect(clientFormSchema.safeParse(VALID_VALUES).success).toBe(true)
  })

  it.each([
    ["name", { ...VALID_VALUES, name: "" }, "clients.validation.nameRequired"],
    [
      "surname",
      { ...VALID_VALUES, surname: "" },
      "clients.validation.surnameRequired",
    ],
    [
      "birthday",
      { ...VALID_VALUES, birthday: "" },
      "clients.validation.birthdayRequired",
    ],
    ["gender", { ...VALID_VALUES, gender: "" }, "clients.validation.genderInvalid"],
    [
      "address.country",
      { ...VALID_VALUES, address: { ...VALID_VALUES.address, country: "" } },
      "clients.validation.countryRequired",
    ],
    [
      "address.city",
      { ...VALID_VALUES, address: { ...VALID_VALUES.address, city: "" } },
      "clients.validation.cityRequired",
    ],
    [
      "address.street",
      { ...VALID_VALUES, address: { ...VALID_VALUES.address, street: "" } },
      "clients.validation.streetRequired",
    ],
  ])("rejects an empty required field: %s", (path, values, message) => {
    expectIssue(values, path, message)
  })

  it.each([
    ["name", { name: LONG_VALUE }, "clients.validation.nameMax"],
    ["surname", { surname: LONG_VALUE }, "clients.validation.surnameMax"],
    [
      "address.country",
      { address: { ...VALID_VALUES.address, country: LONG_VALUE } },
      "clients.validation.countryMax",
    ],
    [
      "address.city",
      { address: { ...VALID_VALUES.address, city: LONG_VALUE } },
      "clients.validation.cityMax",
    ],
    [
      "address.street",
      { address: { ...VALID_VALUES.address, street: LONG_VALUE } },
      "clients.validation.streetMax",
    ],
  ])("rejects 256 characters in %s", (path, overrides, message) => {
    expectIssue({ ...VALID_VALUES, ...overrides }, path, message)
  })

  it("accepts values of exactly 255 characters", () => {
    const value = "a".repeat(255)

    const result = clientFormSchema.safeParse({
      ...VALID_VALUES,
      name: value,
      surname: value,
      address: { country: value, city: value, street: value },
    })

    expect(result.success).toBe(true)
  })

  it.each(["x", "male", "M", "N/A"])(
    "rejects an unsupported gender: %s",
    (gender) => {
      expectIssue(
        { ...VALID_VALUES, gender },
        "gender",
        "clients.validation.genderInvalid",
      )
    },
  )
})

describe("birthday age boundaries", () => {
  const schema = createClientFormSchema(TODAY)

  it.each([
    ["2011-10-16", "clients.validation.ageTooYoung"],
    ["2010-10-17", "clients.validation.ageTooYoung"],
    ["2010-10-16", null],
    ["2009-10-16", null],
    ["1927-10-16", null],
    ["1926-10-17", null],
    ["1926-10-16", null],
    ["1925-10-17", null],
    ["1925-10-16", "clients.validation.ageTooOld"],
  ] as const)("birthday %s on 2026-10-16 → %s", (birthday, expected) => {
    const result = schema.safeParse({ ...VALID_VALUES, birthday })

    if (expected === null) {
      expect(result.success).toBe(true)
      return
    }

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(expected)
    }
  })

  it.each(["2026-10-17", "2027-01-01"])(
    "rejects the future date %s",
    (birthday) => {
      const result = schema.safeParse({ ...VALID_VALUES, birthday })

      expect(result.success).toBe(false)

      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "clients.validation.birthdayFuture",
        )
      }
    },
  )

  it.each([
    "2026-02-30",
    "1900-02-29",
    "2010-13-01",
    "2010-00-10",
    "2010-01-00",
    "2010-1-05",
    "16-10-2010",
    "2010/10/16",
    "not-a-date",
  ])("rejects the invalid calendar date %s", (birthday) => {
    const result = schema.safeParse({ ...VALID_VALUES, birthday })

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "clients.validation.birthdayInvalid",
      )
    }
  })

  it("accepts a leap day that exists", () => {
    const result = schema.safeParse({ ...VALID_VALUES, birthday: "2024-02-29" })

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "clients.validation.ageTooYoung",
      )
    }
  })
})

describe("resolveBirthdayError", () => {
  it.each([
    ["2010-10-17", "clients.validation.ageTooYoung"],
    ["2010-10-16", null],
    ["1925-10-16", "clients.validation.ageTooOld"],
    ["1926-10-16", null],
    ["2026-10-17", "clients.validation.birthdayFuture"],
    ["2026-02-30", "clients.validation.birthdayInvalid"],
    ["", "clients.validation.birthdayInvalid"],
  ])("resolves %s with an explicit today", (value, expected) => {
    expect(resolveBirthdayError(value, TODAY)).toBe(expected)
  })

  it("uses the current system date by default", () => {
    vi.useFakeTimers()
    vi.setSystemTime(TODAY)

    expect(resolveBirthdayError("2010-10-16")).toBeNull()
    expect(resolveBirthdayError("2010-10-17")).toBe(
      "clients.validation.ageTooYoung",
    )
    expect(
      clientFormSchema.safeParse({
        ...VALID_VALUES,
        birthday: "2010-10-16",
      }).success,
    ).toBe(true)
    expect(
      clientFormSchema.safeParse({
        ...VALID_VALUES,
        birthday: "2010-10-17",
      }).success,
    ).toBe(false)
  })
})

describe("clientAddressSchema", () => {
  it("accepts a valid address", () => {
    expect(clientAddressSchema.safeParse(VALID_VALUES.address).success).toBe(
      true,
    )
  })

  it("rejects empty address fields", () => {
    const result = clientAddressSchema.safeParse({
      country: "",
      city: "",
      street: "",
    })

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual([
        "clients.validation.countryRequired",
        "clients.validation.cityRequired",
        "clients.validation.streetRequired",
      ])
    }
  })
})
