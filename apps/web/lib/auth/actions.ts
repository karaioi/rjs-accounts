"use server";

import { headers } from "next/headers";

import { checkAccountStatus } from "@/lib/api/actions";
import { apiFetch } from "@/lib/api/server";
import type { AccountStatusResponse, MeResponse } from "@/lib/api/types";
import { describeAuthError, TOO_MANY_ATTEMPTS } from "@/lib/auth/errors";
import { checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { auth } from "@/lib/auth/server";
import {
  clearSignInEmail,
  readSignInEmail,
  setSignInEmail,
} from "@/lib/auth/sign-in-cookie";
import { loginSchema } from "@/lib/validations/login";
import { otpSchema } from "@/lib/validations/otp";

/**
 * The two-step sign-in, driven from the server.
 *
 * These are Server Actions rather than route handlers: the browser calls a
 * named function, not a URL, so there is no addressable endpoint to aim a
 * crafted payload at and Next.js applies its own Origin check to every call.
 * The password goes from this process to Managed Auth and nowhere else.
 *
 * Why four calls instead of the obvious two: Managed Auth reads the session
 * from the **incoming request's** cookies, so a session it sets during one
 * action is not visible to `auth.token()` until the *next* request. Each step
 * that has to act on a fresh session (open the gate, release the gate) is
 * therefore its own action — which is also what keeps the backend's bearer
 * token server-side.
 *
 * Every action resolves to a plain result the form renders; it never throws at
 * the client.
 */

export type AuthActionResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      notApproved?: boolean;
      statusResult?: AccountStatusResponse;
    };

export type OtpResult =
  | { ok: true; destination: "/dashboard"; notApproved?: false }
  | {
      ok: true;
      destination?: never;
      notApproved: true;
      statusResult: AccountStatusResponse;
    }
  | { ok: false; message: string };

/** The parts of the login schema this flow needs; the consents are the form's. */
const credentialsSchema = loginSchema.pick({ email: true, password: true });

const CALLER_UNKNOWN_IP = "unknown";

/** The caller's address as far as the platform reports it. */
async function callerIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    CALLER_UNKNOWN_IP
  );
}

/**
 * Run a Managed Auth call, collapsing the two failure shapes into one value:
 * the `{ error }` a client method returns, and the `AuthApiError` some flows
 * throw instead.
 */
async function runAuth(
  call: () => Promise<{ error?: unknown }>,
): Promise<unknown | null> {
  try {
    const { error } = await call();
    return error ?? null;
  } catch (error) {
    return error;
  }
}

/** Step 1: check the password. This is what establishes the session. */
export async function startSignIn(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Enter your email and password." };
  }
  const { email, password } = parsed.data;

  const limit = checkAuthRateLimit({
    path: "sign-in/email",
    ip: await callerIp(),
    email: email.trim().toLowerCase(),
  });
  if (!limit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const error = await runAuth(() => auth.signIn.email({ email, password }));
  if (error) {
    return {
      ok: false,
      message: describeAuthError(error, "Invalid email or password."),
    };
  }

  // Neon Auth verified credentials and issued the session cookie.
  // Check whether the account is approved in the database:
  const statusRes = await checkAccountStatus(email);
  if (statusRes.ok && statusRes.data.status !== "active") {
    await clearSignInEmail();
    return {
      ok: false,
      message: "Your account is not approved yet.",
      notApproved: true,
      statusResult: statusRes.data,
    };
  }

  return { ok: true };
}

/**
 * Step 2: open the backend's sign-in window, then have Managed Auth deliver the
 * code. Also used to resend.
 *
 * Order matters twice over. The window is recorded *before* the code is sent, so
 * a code can never exist for a sign-in the backend would refuse to release; and
 * it is recorded *before the rate-limit check*, so a throttled send cannot be
 * the one path that leaves the window shut. The backend's verdict is keyed on
 * the user, not the session, so until `/start` lands a fresh session still reads
 * as verified from the previous sign-in's record — the throttled resend is the
 * one way the UI could still walk into the workspace without the OTP.
 * Re-opening is deliberate — the previous window (or code) may have expired.
 */
export async function sendSignInCode(input: {
  email: string;
  resend?: boolean;
}): Promise<AuthActionResult> {
  const email = input.email.trim();
  if (!email) {
    return { ok: false, message: "Enter your email address first." };
  }
  const fallback = input.resend
    ? "Could not resend the code."
    : "Could not send the verification code.";

  const started = await apiFetch("/api/v1/auth/login/verification/start", {
    method: "POST",
  });
  if (!started.ok) {
    return {
      ok: false,
      message: "We couldn't start the email verification. Please try again.",
    };
  }

  const limit = checkAuthRateLimit({
    path: "email-otp/send-verification-otp",
    ip: await callerIp(),
    email: email.toLowerCase(),
  });
  if (!limit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const error = await runAuth(() =>
    auth.emailOtp.sendVerificationOtp({ email, type: "sign-in" }),
  );
  if (error) {
    return { ok: false, message: describeAuthError(error, fallback) };
  }

  // The code is out, so remember which account it belongs to. This is what lets
  // the OTP step survive a reload and lets `verifyCode` finish the right
  // sign-in without trusting an email the client could have edited.
  await setSignInEmail(email);
  return { ok: true };
}

/** Step 3: confirm the code with Managed Auth. This refreshes the session. */
export async function verifyCode(input: {
  email: string;
  otp: string;
}): Promise<AuthActionResult> {
  const parsed = otpSchema.safeParse({ otp: input.otp });
  if (!parsed.success) {
    return { ok: false, message: "Enter the 6-digit code from your email." };
  }
  // Prefer the account we recorded when the code was sent; the client value is
  // only a fallback for a flow that began before the cookie existed.
  const email = (await readSignInEmail()) ?? input.email.trim();
  if (!email) {
    return { ok: false, message: "Enter your email address first." };
  }

  const limit = checkAuthRateLimit({
    path: "sign-in/email-otp",
    ip: await callerIp(),
    email: email.toLowerCase(),
  });
  if (!limit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const error = await runAuth(() =>
    auth.signIn.emailOtp({ email, otp: parsed.data.otp }),
  );
  if (error) {
    return {
      ok: false,
      message: describeAuthError(error, "That code is not valid."),
    };
  }

  return { ok: true };
}

/**
 * Step 4: release the backend's gate and pick a landing page.
 *
 * A separate call from `verifyCode` on purpose: the refreshed session it sets
 * only reaches `auth.token()` on the next request.
 */
export async function completeSignIn(): Promise<OtpResult> {
  const gate = await apiFetch("/api/v1/auth/login/verification/complete", {
    method: "POST",
  });
  if (!gate.ok) {
    // The code expired (or the step was never recorded). Do not push into a
    // workspace the backend would keep gated — ask for a fresh code.
    return {
      ok: false,
      message: "That code has expired. Send a new one and try again.",
    };
  }

  // The sign-in is finished: drop the pending-step cookie so a later visit to
  // `/login` starts clean at the credentials screen.
  await clearSignInEmail();

  // Approval is the remaining gate: a `pending` account keeps its session but
  // should not route to /pending. Instead return notApproved with the status details.
  const account = await apiFetch("/api/v1/me");
  if (account.ok) {
    const profile = (await account.json()) as MeResponse;
    if (!profile.is_platform_admin && profile.account_status !== "active") {
      const statusRes = profile.email
        ? await checkAccountStatus(profile.email)
        : null;
      return {
        ok: true,
        notApproved: true,
        statusResult: statusRes?.ok
          ? statusRes.data
          : {
              email: profile.email ?? "",
              status:
                (profile.account_status as AccountStatusResponse["status"]) ||
                "pending",
              name: profile.name,
              email_verified: profile.email_verified,
              created_at: null,
              approved_at: null,
            },
      };
    }
  }

  return { ok: true, destination: "/dashboard" };
}

/**
 * Abandon a half-finished sign-in.
 *
 * The form's "Back" button returns to the credentials step; this drops the
 * pending-step cookie with it so a reload doesn't jump straight back to an OTP
 * screen for an account the visitor just left.
 */
export async function cancelSignIn(): Promise<void> {
  await clearSignInEmail();
}
