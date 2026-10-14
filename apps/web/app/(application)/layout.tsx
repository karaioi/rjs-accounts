import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { apiFetch } from "@/lib/api/server";
import type { MeResponse } from "@/lib/api/types";

/**
 * Shell for the signed-in workspace. A sidebar holds the brand, navigation,
 * and sign-out — the workspace stays focused on the content.
 */
export default async function ApplicationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const response = await apiFetch("/api/v1/me");
  const me: MeResponse | null = response.ok ? await response.json() : null;

  if (!me) {
    redirect("/login");
  }

  return (
    <div className="flex h-dvh bg-[#f5f5f5]">
      <Sidebar
        isAdmin={me.is_platform_admin}
        user={{
          name: me.name,
          email: me.email,
          organization: me.memberships[0]?.organization_name ?? null,
          role: me.is_platform_admin
            ? "Platform Admin"
            : (me.memberships[0]?.role_slug ?? "User"),
          accountStatus: me.account_status,
        }}
      />
      <main className="flex-1 min-h-0 overflow-y-auto scroll-smooth flex flex-col">
        {children}
      </main>
    </div>
  );
}
