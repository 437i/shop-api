import { z } from "zod"

import {
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  passwordByteLength,
} from "@/pages/auth/passwordRules"

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: "auth.validation.currentPasswordRequired" }),
  newPassword: z
    .string()
    .min(1, { message: "auth.validation.newPasswordRequired" })
    .refine((value) => value.length > MIN_PASSWORD_LENGTH, {
      message: "auth.validation.passwordShort",
    })
    .refine((value) => passwordByteLength(value) <= MAX_PASSWORD_BYTES, {
      message: "auth.validation.passwordTooLong",
    }),
})

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
