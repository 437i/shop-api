import { z } from "zod"

const MAX_FIELD_LENGTH = 255

const PRICE_PATTERN = /^[1-9]\d{0,9}(\.\d{1,2})?$/

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/

export function isValidPrice(value: string): boolean {
  return PRICE_PATTERN.test(value)
}

export function isValidPositiveInteger(value: string): boolean {
  return POSITIVE_INTEGER_PATTERN.test(value)
}

function createLimitedStringField(
  requiredMessage: string,
  maxMessage: string,
) {
  return z
    .string()
    .min(1, { message: requiredMessage })
    .max(MAX_FIELD_LENGTH, { message: maxMessage })
}

function createPriceField() {
  return z.string().superRefine((value, context) => {
    if (value.length === 0) {
      context.addIssue({
        code: "custom",
        message: "products.validation.priceRequired",
      })

      return
    }

    if (!isValidPrice(value)) {
      context.addIssue({
        code: "custom",
        message: "products.validation.priceInvalid",
      })
    }
  })
}

function createPositiveIntegerField(
  requiredMessage: string,
  invalidMessage: string,
) {
  return z.string().superRefine((value, context) => {
    if (value.length === 0) {
      context.addIssue({ code: "custom", message: requiredMessage })

      return
    }

    if (!isValidPositiveInteger(value)) {
      context.addIssue({ code: "custom", message: invalidMessage })
    }
  })
}

export const createProductSchema = z.object({
  name: createLimitedStringField(
    "products.validation.nameRequired",
    "products.validation.nameMax",
  ),
  category: createLimitedStringField(
    "products.validation.categoryRequired",
    "products.validation.categoryMax",
  ),
  price: createPriceField(),
  stock: createPositiveIntegerField(
    "products.validation.stockRequired",
    "products.validation.stockInvalid",
  ),
  supplierId: z.string().min(1, {
    message: "products.validation.supplierRequired",
  }),
})

export function createDecreaseStockSchema(availableStock: number) {
  return z.object({
    amount: z.string().superRefine((value, context) => {
      if (value.length === 0) {
        context.addIssue({
          code: "custom",
          message: "products.validation.amountRequired",
        })

        return
      }

      if (!isValidPositiveInteger(value)) {
        context.addIssue({
          code: "custom",
          message: "products.validation.amountInvalid",
        })

        return
      }

      if (Number(value) > availableStock) {
        context.addIssue({
          code: "custom",
          message: "products.validation.amountTooLarge",
        })
      }
    }),
  })
}

export type ProductFormValues = z.infer<typeof createProductSchema>

export type DecreaseStockFormValues = z.infer<
  ReturnType<typeof createDecreaseStockSchema>
>
