import {
  Notification03Icon,
  UserCheck01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Reveal } from "@/components/motion/reveal";
import { apiFetch } from "@/lib/api/server";

export default async function DashboardPage() {
  const response = await apiFetch("/api/v1/me");
  const me = response.ok ? await response.json() : null;

  // A session alone is not enough: until an administrator approves the account,
  // the workspace stays locked.
  if (me && !me.is_platform_admin && me.account_status !== "active") {
    redirect("/pending");
  }

  return (
    <Reveal variant="fade-up" className="flex flex-col gap-6 p-8">
      <HugeiconsIcon
        icon={Notification03Icon}
        size={24}
        color="currentColor"
        strokeWidth={1.5}
      />

      {me?.is_platform_admin && (
        <Link
          href="/admin/users"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-black/10 bg-[#fffafa]/70 px-4 py-2.5 text-sm font-medium text-brand-blue underline-offset-4 hover:underline"
        >
          <HugeiconsIcon icon={UserCheck01Icon} size={16} strokeWidth={1.5} />
          Review pending accounts
        </Link>
      )}
    </Reveal>
  );
}
