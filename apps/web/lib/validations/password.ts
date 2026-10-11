import * as z from "zod";

/**
 * Shared account password policy: 8–64 characters with mixed character classes.
 *
 * Kept on its own so sign-in and sign-up can never drift apart — the API and the
 * `PasswordRequirements` checklist both mirror these rules.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(64, "Password must be at most 64 characters.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must include at least one special character.",
  );
