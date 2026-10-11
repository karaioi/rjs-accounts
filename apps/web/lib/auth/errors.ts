/**
 * Managed Auth (Better Auth) surfaces failures in two shapes: the client
 * *throws* an `AuthApiError` (`{ name, message, code, status }`) for API
 * responses, and some flows also *return* `{ error }`. Either way `code` is the
 * stable contract, so we map it to copy we're happy to show a user and fall
 * back to the provider's own message when we don't recognise it.
 *
 * Codes are compared case-insensitively: the API uses `INVALID_EMAIL_OR_PASSWORD`
 * while the thrown error carries `invalid_credentials`.
 */

/** Copy for a `429`, shared by the client flows and the auth proxy so a limit
 * reads the same whether it was hit at Managed Auth or at our own backend. */
export const TOO_MANY_ATTEMPTS =
  "Too many attempts. Please wait a moment and try again.";

const MESSAGES: Record<string, string> = {
  invalid_email_or_password: "Incorrect email or password. Please try again.",
  invalid_credentials: "Incorrect email or password. Please try again.",
  invalid_email: "That email address doesn't look right.",
  invalid_email_format: "That email address doesn't look right.",
  invalid_password: "That password doesn't look right.",
  password_compromised:
    "That password has appeared in a data breach. Please choose a different one.",
  password_too_short: "That password is too short.",
  password_too_long: "That password is too long.",
  user_not_found: "We couldn't find an account with that email address.",
  email_not_verified:
    "Your email isn't verified yet. Verify it, then try signing in again.",
  user_already_exists:
    "An account with this email already exists. Try signing in instead.",
  user_already_exists_use_another_email:
    "An account with this email already exists. Try signing in instead.",
  email_already_exists:
    "An account with this email already exists. Try signing in instead.",
  invalid_otp: "That code isn't right. Check the email and try again.",
  otp_expired: "That code has expired. Request a new one.",
  otp_has_expired: "That code has expired. Request a new one.",
  too_many_requests: TOO_MANY_ATTEMPTS,
};

function normalize(error: unknown): { code?: string; message?: string } {
  if (typeof error === "string") {
    return { message: error };
  }
  if (typeof error !== "object" || error === null) {
    return {};
  }
  const value = error as Record<string, unknown>;
  return {
    code: typeof value.code === "string" ? value.code : undefined,
    message: typeof value.message === "string" ? value.message : undefined,
  };
}

/**
 * Turn any thrown/returned auth error into user-facing copy. Accepts the raw
 * thrown value so call sites can use it directly in `catch`, e.g.
 * `catch (error) { setError(describeAuthError(error, "…")); }`.
 */
export function describeAuthError(error: unknown, fallback: string): string {
  const { code, message } = normalize(error);
  if (code) {
    const mapped = MESSAGES[code.toLowerCase()];
    if (mapped) {
      return mapped;
    }
  }
  return message ?? fallback;
}
