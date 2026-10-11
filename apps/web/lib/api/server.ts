import { auth } from "@/lib/auth/server";
import { requireEnv } from "@/lib/env";

const API_BASE_URL = requireEnv("API_BASE_URL");

/**
 * Backend headers the browser cares about, passed through by the relays:
 * the gate signal, and the rate-limit metadata on a `429`.
 */
const PASSTHROUGH_HEADERS = [
  "x-login-verification",
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
];

/** Copy a backend response's status-relevant headers for a relayed response. */
export function relayHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": response.headers.get("content-type") ?? "application/json",
  };
  for (const name of PASSTHROUGH_HEADERS) {
    const value = response.headers.get(name);
    if (value) {
      headers[name] = value;
    }
  }
  return headers;
}

/**
 * Call the FastAPI backend from the Next server, forwarding the caller's bearer
 * token. Keeping this server-side means the browser never sees the backend URL,
 * the token, or the database.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { data } = await auth.token();

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (data?.token) {
    headers.set("Authorization", `Bearer ${data.token}`);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
