import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** Record that an OTP was requested (step 2 of sign-in). */
export async function POST() {
  const response = await apiFetch("/api/v1/auth/login/verification/start", {
    method: "POST",
  });
  const body = await response.text();

  return new NextResponse(body || null, {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
}
