import { auth } from "@/lib/auth/server";

/**
 * Route protection (Next 16 `proxy.ts`).
 *
 * Only the pages behind a session are matched. Auth routes, the login / sign-up
 * / pending screens, and static assets stay reachable so an unauthenticated
 * visitor can actually reach them.
 */
export default auth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
