import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api/server";
import { AdminUsers, type PendingUser } from "./admin-users";

/**
 * Platform-admin approval queue. Guarded twice: the Proxy requires a session,
 * and this page requires `is_platform_admin` on `/me` (a UI convenience — the
 * API rejects non-admins regardless).
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
  const users: PendingUser[] | null = listResponse.ok
    ? await listResponse.json()
    : null;
  const gateRequired =
    listResponse.headers.get("x-login-verification") === "required";

  return <AdminUsers users={users} gateRequired={gateRequired} />;
}
