import { createNeonAuth } from "@neondatabase/auth/next/server";

import { requireEnv } from "@/lib/env";

/**
 * Server-side Neon Auth instance (Managed Better Auth).
 *
 * Used by the auth proxy route, by `proxy.ts` middleware, and by server code
 * that needs the session or a bearer token for the FastAPI backend.
 */
export const auth = createNeonAuth({
  baseUrl: requireEnv("NEON_AUTH_BASE_URL"),
  cookies: {
    secret: requireEnv("NEON_AUTH_COOKIE_SECRET"),
  },
});
