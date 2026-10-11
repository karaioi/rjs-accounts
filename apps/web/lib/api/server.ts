import { auth } from "@/lib/auth/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

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
