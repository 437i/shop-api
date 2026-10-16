import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "validation.emailRequired" })
    .refine((value) => z.email().safeParse(value).success, {
      message: "validation.invalidEmail",
    }),
  password: z.string().min(1, { message: "validation.passwordRequired" }),
})

export type LoginFormValues = z.infer<typeof loginSchema>
