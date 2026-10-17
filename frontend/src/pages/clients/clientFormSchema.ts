import { z } from "zod"

export const CLIENT_GENDERS = ["m", "f", "n/a"] as const

const MAX_FIELD_LENGTH = 255
const MIN_AGE = 16
const MAX_AGE = 100

const BIRTHDAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

interface CalendarDate {
  year: number
  month: number
  day: number
}

function parseCalendarDate(value: string): CalendarDate | null {
  const match = BIRTHDAY_PATTERN.exec(value)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}

function toCalendarDate(date: Date): CalendarDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function compareCalendarDates(left: CalendarDate, right: CalendarDate): number {
  if (left.year !== right.year) {
    return left.year - right.year
  }

  if (left.month !== right.month) {
    return left.month - right.month
  }

  return left.day - right.day
}

function calculateAge(birthday: CalendarDate, today: CalendarDate): number {
  const beforeBirthdayThisYear =
    today.month < birthday.month ||
    (today.month === birthday.month && today.day < birthday.day)

  return today.year - birthday.year - (beforeBirthdayThisYear ? 1 : 0)
}

export function resolveBirthdayError(
  value: string,
  today: Date = new Date(),
): string | null {
  const birthday = parseCalendarDate(value)

  if (!birthday) {
    return "clients.validation.birthdayInvalid"
  }

  const currentDate = toCalendarDate(today)

  if (compareCalendarDates(birthday, currentDate) > 0) {
    return "clients.validation.birthdayFuture"
  }

  const age = calculateAge(birthday, currentDate)

  if (age < MIN_AGE) {
    return "clients.validation.ageTooYoung"
  }

  if (age > MAX_AGE) {
    return "clients.validation.ageTooOld"
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

export const clientAddressSchema = z.object({
  country: createLimitedStringField(
    "clients.validation.countryRequired",
    "clients.validation.countryMax",
  ),
  city: createLimitedStringField(
    "clients.validation.cityRequired",
    "clients.validation.cityMax",
  ),
  street: createLimitedStringField(
    "clients.validation.streetRequired",
    "clients.validation.streetMax",
  ),
})

function createBirthdayField(today?: Date) {
  return z.string().superRefine((value, context) => {
    if (value.length === 0) {
      context.addIssue({
        code: "custom",
        message: "clients.validation.birthdayRequired",
      })

      return
    }

    const errorKey = resolveBirthdayError(value, today ?? new Date())

    if (errorKey) {
      context.addIssue({ code: "custom", message: errorKey })
    }
  })
}

export function createClientFormSchema(today?: Date) {
  return z.object({
    name: createLimitedStringField(
      "clients.validation.nameRequired",
      "clients.validation.nameMax",
    ),
    surname: createLimitedStringField(
      "clients.validation.surnameRequired",
      "clients.validation.surnameMax",
    ),
    birthday: createBirthdayField(today),
    gender: z.enum(CLIENT_GENDERS, {
      message: "clients.validation.genderInvalid",
    }),
    address: clientAddressSchema,
  })
}

export const clientFormSchema = createClientFormSchema()

export type ClientAddressFormValues = z.infer<typeof clientAddressSchema>

export type ClientFormValues = z.infer<typeof clientFormSchema>
