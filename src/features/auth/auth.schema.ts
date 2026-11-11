import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "validation.emailRequired")
    .email("validation.emailInvalid"),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .length(6, "validation.otpLength")
    .regex(/^\d{6}$/, "validation.otpDigits"),
})

export type OtpFormData = z.infer<typeof otpSchema>
