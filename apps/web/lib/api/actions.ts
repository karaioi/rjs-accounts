"use server";

import { apiFetch } from "@/lib/api/server";
import { TOO_MANY_ATTEMPTS } from "@/lib/auth/errors";

/**
 * Named Server Actions for the FastAPI calls the browser makes.
 *
 * These replace the former `/api/backend/[...path]` catch-all relay. The client
 * calls a function, not a URL, so there is no addressable proxy left to aim an
 * arbitrary path, method, or body at — each action fixes the backend path and
 * checks its own input first. The caller's bearer token is still attached
 * server-side by `apiFetch`; the browser never sees it.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

/** Hand a freshly verified account to the approval workflow. */
export async function registerAccount(): Promise<ActionResult> {
  const response = await apiFetch("/api/v1/auth/register", { method: "POST" });

  if (response.status === 429) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }
  if (!response.ok) {
    return {
      ok: false,
      message:
        "Your email is verified, but we could not finish registration. Please contact support.",
    };
  }

  return { ok: true };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UserDecision = "approve" | "reject";

/** Activate or decline a pending account (platform admins only). */
export async function decideUser(input: {
  userId: string;
  decision: UserDecision;
}): Promise<ActionResult> {
  if (!UUID.test(input.userId)) {
    return { ok: false, message: "That account could not be found." };
  }
  if (input.decision !== "approve" && input.decision !== "reject") {
    return { ok: false, message: "That action is not supported." };
  }

  const response = await apiFetch(
    `/api/v1/users/${input.userId}/${input.decision}`,
    { method: "POST" },
  );

  if (!response.ok) {
    return {
      ok: false,
      message:
        input.decision === "approve"
          ? "Could not approve that account. Please try again."
          : "Could not decline that account. Please try again.",
    };
  }

  return { ok: true };
}
