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
    <div className="flex min-h-dvh">
      <Sidebar isAdmin={me.is_platform_admin} />
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
