import { z } from "zod"

const MAX_FIELD_LENGTH = 255

const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/

export function normalizePhone(value: string): string {
  const characters = Array.from(value)
  let normalized = ""

  for (const [index, character] of characters.entries()) {
    if (character === "+" && index === 0) {
      normalized += character

      continue
    }

    if (character >= "0" && character <= "9") {
      normalized += character
    }
  }

  return normalized
}

export function resolvePhoneError(value: string): string | null {
  if (!PHONE_PATTERN.test(normalizePhone(value))) {
    return "suppliers.validation.phoneInvalid"
  }

  return null
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

function createPhoneField() {
  return z.string().superRefine((value, context) => {
    if (value.length === 0) {
      context.addIssue({
        code: "custom",
        message: "suppliers.validation.phoneRequired",
      })

      return
    }

    const errorKey = resolvePhoneError(value)

    if (errorKey) {
      context.addIssue({ code: "custom", message: errorKey })
    }
  })
}

export const supplierAddressSchema = z.object({
  country: createLimitedStringField(
    "suppliers.validation.countryRequired",
    "suppliers.validation.countryMax",
  ),
  city: createLimitedStringField(
    "suppliers.validation.cityRequired",
    "suppliers.validation.cityMax",
  ),
  street: createLimitedStringField(
    "suppliers.validation.streetRequired",
    "suppliers.validation.streetMax",
  ),
})

export const supplierFormSchema = z.object({
  name: createLimitedStringField(
    "suppliers.validation.nameRequired",
    "suppliers.validation.nameMax",
  ),
  phone: createPhoneField(),
  address: supplierAddressSchema,
})

export type SupplierAddressFormValues = z.infer<typeof supplierAddressSchema>

export type SupplierFormValues = z.infer<typeof supplierFormSchema>
