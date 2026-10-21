import { z } from "zod"

import {
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  passwordByteLength,
} from "@/pages/auth/passwordRules"

const NAME_PATTERN = /^[А-Яа-яЁёA-Za-z]+$/
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(ru|com)$/
const PHONE_PATTERN = /^(\+7|8)-?\d{3}-?\d{3}-?\d{2}-?\d{2}$/

const MAX_NAME_LENGTH = 29
const MAX_EMAIL_LENGTH = 49

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, { message: "auth.validation.nameRequired" })
    .max(MAX_NAME_LENGTH, { message: "auth.validation.nameTooLong" })
    .refine((value) => NAME_PATTERN.test(value), {
      message: "auth.validation.nameInvalid",
    }),
  surname: z
    .string()
    .min(1, { message: "auth.validation.surnameRequired" })
    .max(MAX_NAME_LENGTH, { message: "auth.validation.surnameTooLong" })
    .refine((value) => NAME_PATTERN.test(value), {
      message: "auth.validation.surnameInvalid",
    }),
  email: z
    .string()
    .min(1, { message: "auth.validation.emailRequired" })
    .max(MAX_EMAIL_LENGTH, { message: "auth.validation.emailTooLong" })
    .refine((value) => EMAIL_PATTERN.test(value), {
      message: "auth.validation.emailInvalid",
    }),
  phone: z
    .string()
    .min(1, { message: "auth.validation.phoneRequired" })
    .refine((value) => PHONE_PATTERN.test(value), {
      message: "auth.validation.phoneInvalid",
    }),
  password: z
    .string()
    .min(1, { message: "auth.validation.passwordRequired" })
    .refine((value) => value.length > MIN_PASSWORD_LENGTH, {
      message: "auth.validation.passwordShort",
    })
    .refine((value) => passwordByteLength(value) <= MAX_PASSWORD_BYTES, {
      message: "auth.validation.passwordTooLong",
    }),
})

export type RegisterFormValues = z.infer<typeof registerSchema>
