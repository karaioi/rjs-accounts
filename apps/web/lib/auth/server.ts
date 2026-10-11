import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Server-side Neon Auth instance (Managed Better Auth).
 *
 * Used by the auth proxy route, by `proxy.ts` middleware, and by server code
 * that needs the session or a bearer token for the FastAPI backend.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL as string,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET as string,
  },
});
