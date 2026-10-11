import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * Relay the backend's two-step sign-in gate to the browser (same-origin).
 *
 * The browser never talks to FastAPI directly; these handlers attach the
 * caller's bearer token server-side.
 */
async function relay(path: string, method: "GET" | "POST") {
  const response = await apiFetch(path, { method });
  const body = await response.text();

  return new NextResponse(body || null, {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
}

export function GET() {
  return relay("/api/v1/auth/login/verification", "GET");
}
