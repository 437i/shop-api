import { z } from "zod"

export const resetPasswordSchema = z.object({
  email: z.string().min(1, { message: "auth.validation.emailRequired" }),
})

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
