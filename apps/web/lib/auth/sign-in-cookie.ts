import { cookies } from "next/headers";

/**
 * The sign-in step cookie.
 *
 * Sign-in is two Server Actions: the password step, then the emailed code. The
 * second action needs the account it is finishing, and the form needs it again
 * after a reload — React state alone is lost the moment the tab refreshes, and
 * the visitor lands back on the credentials screen while the backend is still
 * waiting for a code.
 *
 * So the pending email lives in an `HttpOnly` cookie under the app's
 * `rjs-accounts.*` namespace (the browser never reads it back from JS), with a
 * short TTL that matches the code window: an abandoned half-sign-in forgets
 * itself instead of resurrecting the OTP screen days later.
 */

/** Namespaced like the session cookies the auth proxy issues. */
export const SIGN_IN_EMAIL_COOKIE = "rjs-accounts.sign-in-email";

/** Covers the code window plus a resend, then expires on its own. */
const MAX_AGE_SECONDS = 10 * 60;

/** The account a half-finished sign-in is for, if there is one. */
export async function readSignInEmail(): Promise<string | null> {
  const store = await cookies();
  return store.get(SIGN_IN_EMAIL_COOKIE)?.value ?? null;
}

/** Remember which account the emailed code was sent to. */
export async function setSignInEmail(email: string): Promise<void> {
  const store = await cookies();
  store.set(SIGN_IN_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Forget the pending sign-in (finished, cancelled, or signed out). */
export async function clearSignInEmail(): Promise<void> {
  const store = await cookies();
  store.delete(SIGN_IN_EMAIL_COOKIE);
}
