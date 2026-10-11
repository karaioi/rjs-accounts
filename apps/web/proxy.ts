import { NEON_AUTH_SESSION_COOKIE_NAME } from "@neondatabase/auth/server";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";

/**
 * Route protection + auth-page redirects (Next 16 `proxy.ts`).
 *
 * Two jobs:
 *  1. `/dashboard` and `/admin` need a session — the Managed Auth middleware
 *     sends anonymous visitors to `/login` and refreshes the session cookies.
 *  2. `/login` and `/sign-up` are hidden from anyone already signed in: they are
 *     sent to `/dashboard` and stay there until they sign out.
 *
 * The one exception is the sign-in OTP step, which lives on `/login` itself. A
 * visitor who has just passed the password step is *not* signed in yet, so the
 * redirect stands aside until that step is done — otherwise a reload would
 * strand them on a dashboard whose data endpoints are still gated.
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
 * do we ask the backend for the sign-in gate, because the OTP step is part of
 * signing in — a pending, unexpired code means the visitor is still on `/login`.
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

    const gate: { verified?: boolean; expires_at?: string | null } =
      await response.json();

    if (gate.verified) {
      return true;
    }

    // Mid sign-in: the code was requested and its window is still open, so the
    // visitor belongs on /login to type it in.
    const awaitingCode = gate.expires_at
      ? new Date(gate.expires_at).getTime() > Date.now()
      : false;

    return !awaitingCode;
  } catch {
    // Never trap a visitor on an auth page because a check failed.
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAuthEntry(pathname)) {
    if (await isSignedIn(request)) {
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
