import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api/server";
import { AdminUsers, type PendingUser } from "./admin-users";

/**
 * Platform-admin approval queue. Guarded three ways: the Proxy requires a
 * session, this page requires `is_platform_admin` on `/me`, and a session that
 * hasn't confirmed its email-OTP step goes back to `/login` (all UI conveniences
 * — the API rejects non-admins and unconfirmed sessions regardless).
 */
export default async function AdminUsersPage() {
  const meResponse = await apiFetch("/api/v1/me");
  if (!meResponse.ok) {
    redirect("/login");
  }

  const me = await meResponse.json();
  if (!me.is_platform_admin) {
    redirect("/dashboard");
  }

  const listResponse = await apiFetch("/api/v1/users?status=pending");

  // A session that hasn't confirmed the email-OTP step is rejected here with a
  // 403 tagged `X-Login-Verification: required`. Send the admin back to the
  // sign-in flow instead of rendering a queue behind a gate that will stay
  // closed (the API is the source of truth; the proxy mirrors it).
  if (listResponse.headers.get("x-login-verification") === "required") {
    redirect("/login");
  }

  const users: PendingUser[] | null = listResponse.ok
    ? await listResponse.json()
    : null;

  return <AdminUsers users={users} />;
}
