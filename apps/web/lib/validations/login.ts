import * as z from "zod";

import { passwordSchema } from "./password";

/**
 * Login form schema (Zod v4 / Standard Schema).
 *
 * Kept out of the page component so the same rules can be reused for
 * client-side validation, tests, and (later) server-side validation.
 */
export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: passwordSchema,
});

export type LoginValues = z.infer<typeof loginSchema>;
