import { NextResponse } from "next/server";

import { consume, type RateLimitRule } from "@/lib/rate-limit";

/**
 * Rate limits for the Managed Auth calls the browser makes through the
 * same-origin proxy at `/api/auth/[...path]`.
 *
 * This is the only place the app can bound the OTP endpoints themselves: the
 * code is sent and checked by Managed Auth, and Neon Auth exposes no limiter
 * config (its built-in rules are fixed — 3 requests / 10s on `/sign-in*` and
 * `/sign-up*`, 3 / 60s on `/email-otp/send-verification-otp`). Those defaults
 * are short and burst-shaped; these limits are per *identity*, which is what
 * stops one account or inbox from being hammered.
 *
 * Two keys per route where it matters:
 *   - `ip`      — a blunt stop for one source spraying many accounts.
 *   - `subject` — the email from the body, so a single victim can't be flooded.
 *
 * The counters are per server instance; see `lib/rate-limit.ts`.
 */

const MINUTE = 60_000;
const QUARTER_HOUR = 15 * MINUTE;
const HOUR = 60 * MINUTE;

type Policy = {
  ip: RateLimitRule;
  /** Only where the body carries an email that identifies the target. */
  subject?: RateLimitRule;
};

/** Keyed by the path after `/api/auth/`. */
const POLICIES: Record<string, Policy> = {
  "sign-in/email": {
    ip: { limit: 10, windowMs: QUARTER_HOUR },
    subject: { limit: 5, windowMs: QUARTER_HOUR },
  },
  "sign-up/email": {
    ip: { limit: 5, windowMs: HOUR },
  },
  "email-otp/send-verification-otp": {
    ip: { limit: 20, windowMs: QUARTER_HOUR },
    subject: { limit: 5, windowMs: QUARTER_HOUR },
  },
  "sign-in/email-otp": {
    ip: { limit: 30, windowMs: QUARTER_HOUR },
    subject: { limit: 10, windowMs: QUARTER_HOUR },
  },
  "email-otp/verify-email": {
    ip: { limit: 30, windowMs: QUARTER_HOUR },
    subject: { limit: 10, windowMs: QUARTER_HOUR },
  },
  "email-otp/check-verification-otp": {
    ip: { limit: 30, windowMs: QUARTER_HOUR },
    subject: { limit: 10, windowMs: QUARTER_HOUR },
  },
};

/** The caller's address as far as the platform reports it. */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

/** The email in a JSON body, normalised for use as a rate-limit key. */
async function bodyEmail(request: Request): Promise<string | null> {
  try {
    const body = (await request.clone().json()) as { email?: unknown };
    if (typeof body?.email === "string") {
      return body.email.trim().toLowerCase();
    }
  } catch {
    // No body, or not JSON — IP-only limiting still applies.
  }
  return null;
}

/**
 * Consume the rate-limit budget for this request.
 *
 * Returns a `429` response to send back when a limit is exceeded, or `null` to
 * let the request through to Managed Auth. Untracked paths always pass.
 */
export async function enforceAuthRateLimit(
  request: Request,
): Promise<NextResponse | null> {
  const path = new URL(request.url).pathname.replace(/^\/api\/auth\/?/, "");
  const policy = POLICIES[path];
  if (!policy) {
    return null;
  }

  const now = Date.now();
  const decisions = [
    consume(`auth:${path}:ip:${clientIp(request)}`, policy.ip, now),
  ];

  if (policy.subject) {
    const email = await bodyEmail(request);
    if (email) {
      decisions.push(
        consume(`auth:${path}:email:${email}`, policy.subject, now),
      );
    }
  }

  const blocked = decisions.find((decision) => !decision.allowed);
  if (!blocked || blocked.allowed) {
    return null;
  }

  // Better Auth's error shape, so the client's `describeAuthError` shows the
  // same "too many attempts" copy it would for a Managed Auth 429.
  return NextResponse.json(
    {
      message: "Too many attempts. Please wait before trying again.",
      code: "TOO_MANY_REQUESTS",
    },
    {
      status: 429,
      headers: { "Retry-After": String(blocked.retryAfterSeconds) },
    },
  );
}
