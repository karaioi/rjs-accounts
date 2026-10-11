import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * Same-origin relay to the FastAPI backend.
 *
 * The browser never talks to the API directly: this handler attaches the
 * caller's bearer token server-side, so the backend URL, the token, and the
 * database stay off the client. `/api/backend/me` → `{API}/api/v1/me`.
 */
async function forward(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  const search = new URL(request.url).search;

  const headers: Record<string, string> = {};
  const organizationId = request.headers.get("x-organization-id");
  if (organizationId) {
    headers["x-organization-id"] = organizationId;
  }

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const response = await apiFetch(`/api/v1/${path.join("/")}${search}`, init);
  const body = await response.text();

  const responseHeaders: Record<string, string> = {
    "content-type": response.headers.get("content-type") ?? "application/json",
  };
  // Surfaced so the UI can tell "needs OTP" apart from a real 403.
  const verification = response.headers.get("x-login-verification");
  if (verification) {
    responseHeaders["x-login-verification"] = verification;
  }

  return new NextResponse(body || null, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
