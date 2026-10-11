import { enforceAuthRateLimit } from "@/lib/auth/rate-limit";
import { auth } from "@/lib/auth/server";

/**
 * Same-origin proxy for all Managed Auth requests.
 *
 * Wrapped so the sign-in, sign-up, and OTP calls are rate limited before they
 * reach Managed Auth (see `lib/auth/rate-limit.ts`); every other path falls
 * straight through to the Managed Auth handler.
 */
const handlers = auth.handler();

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(
  method: keyof typeof handlers,
  request: Request,
  context: RouteContext,
) {
  return (
    (await enforceAuthRateLimit(request)) ?? handlers[method](request, context)
  );
}

export function GET(request: Request, context: RouteContext) {
  return handle("GET", request, context);
}

export function POST(request: Request, context: RouteContext) {
  return handle("POST", request, context);
}

export function PUT(request: Request, context: RouteContext) {
  return handle("PUT", request, context);
}

export function PATCH(request: Request, context: RouteContext) {
  return handle("PATCH", request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return handle("DELETE", request, context);
}
