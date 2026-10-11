import * as z from "zod";

/**
 * Login form schema (Zod v4 / Standard Schema).
 *
 * Kept out of the page component so the same rules can be reused for
 * client-side validation, tests, and (later) server-side validation.
 */
export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(64, "Password must be at most 64 characters.")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
    .regex(/[a-z]/, "Password must include at least one lowercase letter.")
    .regex(/[0-9]/, "Password must include at least one number.")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must include at least one special character.",
    ),
  termsAccepted: z
    .boolean()
    .refine((value) => value, "You must accept the Terms & Conditions."),
  privacyAccepted: z
    .boolean()
    .refine((value) => value, "You must accept the Privacy Policy."),
});

export type LoginValues = z.infer<typeof loginSchema>;
