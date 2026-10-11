import { redirect } from "next/navigation";
import { AccessSummary } from "@/components/access-summary";
import { Reveal } from "@/components/motion/reveal";
import { apiFetch } from "@/lib/api/server";
import type { MeResponse } from "@/lib/api/types";

export default async function DashboardPage() {
  const response = await apiFetch("/api/v1/me");
  const me: MeResponse | null = response.ok ? await response.json() : null;

  // A session alone is not enough: until an administrator approves the account,
  // the workspace stays locked.
  if (me && !me.is_platform_admin && me.account_status !== "active") {
    redirect("/pending");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Reveal variant="fade-up">
        {me ? (
          <AccessSummary me={me} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Could not load your account details. Try signing in again.
          </p>
        )}
      </Reveal>
    </div>
  );
}
