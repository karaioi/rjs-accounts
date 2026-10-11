import { auth } from "@/lib/auth/server";

/** Same-origin proxy for all Managed Auth requests. */
export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
