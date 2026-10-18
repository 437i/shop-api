import { describe, expect, it } from "vitest"

import {
  createDecreaseStockSchema,
  createProductSchema,
} from "@/pages/products/productFormSchema"
import type { ProductFormValues } from "@/pages/products/productFormSchema"

const VALID_VALUES: ProductFormValues = {
  name: "Liebherr CNel 4313",
  category: "Refrigerators",
  price: "999.99",
  stock: "5",
  supplierId: "33333333-3333-3333-3333-333333333333",
}

const LONG_VALUE = "a".repeat(256)

function productIssueFor(values: unknown, path: string): string | undefined {
  const result = createProductSchema.safeParse(values)

  if (result.success) {
    return undefined
  }

  return result.error.issues.find(
    (issue) => issue.path.join(".") === path,
  )?.message
}

function decreaseStockIssueFor(
  availableStock: number,
  values: unknown,
  path: string,
): string | undefined {
  const result = createDecreaseStockSchema(availableStock).safeParse(values)

  if (result.success) {
    return undefined
  }

  return result.error.issues.find(
    (issue) => issue.path.join(".") === path,
  )?.message
}

describe("createProductSchema", () => {
  it("accepts valid values", () => {
    expect(createProductSchema.safeParse(VALID_VALUES).success).toBe(true)
  })

  it("does not transform the submitted object", () => {
    const result = createProductSchema.safeParse(VALID_VALUES)

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data).toEqual(VALID_VALUES)
    }
  })

  it.each([
    ["name", { name: "" }, "products.validation.nameRequired"],
    [
      "category",
      { category: "" },
      "products.validation.categoryRequired",
    ],
    ["price", { price: "" }, "products.validation.priceRequired"],
    ["stock", { stock: "" }, "products.validation.stockRequired"],
    [
      "supplierId",
      { supplierId: "" },
      "products.validation.supplierRequired",
    ],
  ])("rejects an empty required field: %s", (path, overrides, message) => {
    expect(productIssueFor({ ...VALID_VALUES, ...overrides }, path)).toBe(
      message,
    )
  })

  it.each([
    ["name", { name: LONG_VALUE }, "products.validation.nameMax"],
    [
      "category",
      { category: LONG_VALUE },
      "products.validation.categoryMax",
    ],
  ])("rejects 256 characters in %s", (path, overrides, message) => {
    expect(productIssueFor({ ...VALID_VALUES, ...overrides }, path)).toBe(
      message,
    )
  })

  it("accepts name and category of exactly 255 characters", () => {
    const value = "a".repeat(255)

    const result = createProductSchema.safeParse({
      ...VALID_VALUES,
      name: value,
      category: value,
    })

    expect(result.success).toBe(true)
  })

  it.each(["10", "999.99", "1234567890", "1234567890.99"])(
    "accepts valid price %s",
    (price) => {
      expect(
        productIssueFor({ ...VALID_VALUES, price }, "price"),
      ).toBeUndefined()
    },
  )

  it.each(["0.5", "007", "10.123", "abc", "12345678901"])(
    "rejects invalid price %s",
    (price) => {
      expect(productIssueFor({ ...VALID_VALUES, price }, "price")).toBe(
        "products.validation.priceInvalid",
      )
    },
  )

  it("accepts a positive integer stock", () => {
    expect(
      productIssueFor({ ...VALID_VALUES, stock: "1" }, "stock"),
    ).toBeUndefined()
  })

  it.each(["0", "-1", "1.5", "007", "abc"])(
    "rejects invalid stock %s",
    (stock) => {
      expect(productIssueFor({ ...VALID_VALUES, stock }, "stock")).toBe(
        "products.validation.stockInvalid",
      )
    },
  )
})

describe("createDecreaseStockSchema", () => {
  it("accepts an amount smaller than the current stock", () => {
    expect(
      decreaseStockIssueFor(5, { amount: "4" }, "amount"),
    ).toBeUndefined()
  })

  it("accepts an amount equal to the current stock", () => {
    const result = createDecreaseStockSchema(5).safeParse({ amount: "5" })

    expect(result.success).toBe(true)
  })

  it("rejects an amount greater than the current stock", () => {
    expect(decreaseStockIssueFor(5, { amount: "6" }, "amount")).toBe(
      "products.validation.amountTooLarge",
    )
  })

  it("rejects an empty amount", () => {
    expect(decreaseStockIssueFor(5, { amount: "" }, "amount")).toBe(
      "products.validation.amountRequired",
    )
  })

  it.each(["0", "-1", "1.5", "abc"])(
    "rejects invalid amount %s",
    (amount) => {
      expect(decreaseStockIssueFor(5, { amount }, "amount")).toBe(
        "products.validation.amountInvalid",
      )
    },
  )

  it("keeps the amount as a string", () => {
    const result = createDecreaseStockSchema(5).safeParse({ amount: "3" })

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.amount).toBe("3")
    }
  })
})
