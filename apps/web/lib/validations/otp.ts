import { z } from "zod";

/** Six-digit email OTP for the second sign-in step. */
export const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

export type OtpValues = z.infer<typeof otpSchema>;
