import { UserCheck01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessSummary } from "@/components/access-summary";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/server";
import type { MeResponse, OrganizationItem } from "@/lib/api/types";

interface PendingUser {
  user_id: string;
  email: string | null;
  name: string | null;
  account_status: string;
}

export default async function DashboardPage() {
  const response = await apiFetch("/api/v1/me");
  const me: MeResponse | null = response.ok ? await response.json() : null;

  // A session alone is not enough: until an administrator approves the account,
  // the workspace stays locked.
  if (me && !me.is_platform_admin && me.account_status !== "active") {
    redirect("/pending");
  }

  let pendingCount = 0;
  let allOrganizations: OrganizationItem[] = [];
  if (me?.is_platform_admin) {
    const pendingResponse = await apiFetch("/api/v1/users?status=pending");
    if (pendingResponse.ok) {
      const pendingUsers: PendingUser[] = await pendingResponse.json();
      pendingCount = pendingUsers.length;
    }

    const orgsResponse = await apiFetch("/api/v1/organizations");
    if (orgsResponse.ok) {
      allOrganizations = await orgsResponse.json();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-8">
      <Reveal variant="fade-up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Overview of your workspace
            </p>
          </div>
          {me?.is_platform_admin && pendingCount > 0 && (
            <Link href="/admin/users">
              <Button className="rounded-3xl">
                <HugeiconsIcon
                  icon={UserCheck01Icon}
                  size={16}
                  strokeWidth={1.5}
                />
                Review pending accounts ({pendingCount})
              </Button>
            </Link>
          )}
        </div>
      </Reveal>

      <Reveal variant="fade-up" delay={0.05}>
        {me ? (
          <AccessSummary me={me} organizations={allOrganizations} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Could not load your account details. Try signing in again.
          </p>
        )}
      </Reveal>
    </div>
  );
}
