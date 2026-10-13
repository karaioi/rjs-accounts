import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api/server";
import type { OrganizationItem } from "@/lib/api/types";
import { AdminOrganizations } from "./admin-organizations";

/**
 * Platform-admin organization management page.
 * Displays organizations in any status (active, pending, suspended, archived),
 * with approval and full deletion (app + Neon Auth) workflows.
 */
export default async function AdminOrganizationsPage() {
  const meResponse = await apiFetch("/api/v1/me");
  if (!meResponse.ok) {
    redirect("/login");
  }

  const me = await meResponse.json();
  if (!me.is_platform_admin) {
    redirect("/dashboard");
  }

  const listResponse = await apiFetch("/api/v1/organizations");

  if (listResponse.headers.get("x-login-verification") === "required") {
    redirect("/login");
  }

  const organizations: OrganizationItem[] | null = listResponse.ok
    ? await listResponse.json()
    : null;

  return <AdminOrganizations organizations={organizations} />;
}
