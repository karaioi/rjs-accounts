import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** Mark the sign-in verified after the OTP was confirmed (step 2 of sign-in). */
export async function POST() {
  const response = await apiFetch("/api/v1/auth/login/verification/complete", {
    method: "POST",
  });
  const body = await response.text();

  return new NextResponse(body || null, {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
}
