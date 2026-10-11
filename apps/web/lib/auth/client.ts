import { createAuthClient } from "@neondatabase/auth/next";

/**
 * Browser auth client.
 *
 * Takes no arguments: it talks to the same-origin proxy mounted at
 * `/api/auth/[...path]`, which forwards to Managed Auth.
 */
export const authClient: ReturnType<typeof createAuthClient> =
  createAuthClient();
