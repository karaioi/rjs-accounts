import { NEON_AUTH_SESSION_COOKIE_NAME } from "@neondatabase/auth/server";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";

/**
 * Route protection + auth-page redirects (Next 16 `proxy.ts`).
 *
 * Two jobs:
 *  1. `/dashboard` and `/admin` need a session — the Managed Auth middleware
 *     sends anonymous visitors to `/login` and refreshes the session cookies.
 *  2. `/login` and `/sign-up` are hidden from anyone who has *finished* signing
 *     in: they are sent to `/dashboard` and stay there until they sign out.
 *
 * "Finished" is the whole two-step sign-in, not just the password step. A
 * session whose email-OTP step is unconfirmed — whether the code window is still
 * open or has already closed — keeps `/login`, so the code can be entered or a
 * fresh one requested. Treating it as signed in would strand it on a workspace
 * whose data endpoints the backend still rejects (403 `X-Login-Verification`).
 */

/** Managed Auth's middleware: session required, cookies refreshed. */
const requireSession = auth.middleware({ loginUrl: "/login" });

/** Sign-in and sign-up — never shown to a signed-in visitor. */
const AUTH_ENTRY_PATHS = ["/login", "/sign-up"];

function isAuthEntry(pathname: string): boolean {
  return AUTH_ENTRY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Whether this request carries a session that has finished signing in.
 *
 * Cheap first: no session cookie at all means no need to ask anyone. Only then
 * do we ask the backend (its verdict is authoritative, and the backend is what
 * actually rejects a half-finished sign-in) — a session counts as signed in only
 * once the email-OTP step is confirmed.
 */
async function isSignedIn(request: NextRequest): Promise<boolean> {
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.includes(NEON_AUTH_SESSION_COOKIE_NAME)) {
    return false;
  }

  try {
    const response = await fetch(new URL("/api/verification", request.url), {
      headers: { cookie },
      cache: "no-store",
    });
    // 401: the session is gone (or was never valid) — show the sign-in page.
    if (!response.ok) {
      return false;
    }

    const gate: { verified?: boolean } = await response.json();
    return gate.verified === true;
  } catch {
    // Never trap a visitor on an auth page because a check failed.
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAuthEntry(pathname)) {
    // Only real page loads are redirected away from the auth pages. A POST here
    // is a Server Action — `/login` and `/sign-up` own theirs — and answering one
    // with a redirect rejects the caller's promise instead of running the step.
    //
    // This matters for the second step of sign-in: the sign-in gate is keyed on
    // the **user**, not the session (`services/verification.py`), so the moment
    // the password step sets a session cookie the gate still reads the previous
    // sign-in's confirmation as `true`. Redirecting on that reading would kill
    // the OTP step of the sign-in the user is actually making.
    if (request.method === "GET" && (await isSignedIn(request))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  return requireSession(request);
}

export const config = {
  matcher: [
    "/login/:path*",
    "/sign-up/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};
