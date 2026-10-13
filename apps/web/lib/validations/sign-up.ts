import * as z from "zod";

import { passwordSchema } from "./password";

/**
 * Sign-up form schema.
 *
 * Registration is self-service but not self-approving: a new account is created
 * in `pending` and only becomes usable once an administrator activates it.
 * `name` is required because Managed Better Auth stores a display name with the
 * identity. See `docs/backend/auth-and-tenancy-design.md`.
 */
export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(120, "Name must be at most 120 characters."),
  organizationName: z
    .string()
    .trim()
    .min(2, "Enter your organization or company name.")
    .max(120, "Organization name must be at most 120 characters."),
  email: z.email("Enter a valid email address."),
  password: passwordSchema,
  termsAccepted: z
    .boolean()
    .refine((value) => value, "You must accept the Terms & Conditions."),
  privacyAccepted: z
    .boolean()
    .refine((value) => value, "You must accept the Privacy Policy."),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
