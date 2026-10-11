import {
  BadgeCheckIcon,
  Building03Icon,
  Clock01Icon,
  Shield01Icon,
  UserCircleIcon,
  UserCheck01Icon,
  UserSearch01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { MeResponse } from "@/lib/api/types";
import {
  accountStatus,
  type BadgeTone,
  orgRole,
  platformRole,
} from "@/lib/data/roles";

const toneClass: Record<BadgeTone, string> = {
  success: "border-brand-green/25 bg-brand-green/10 text-brand-green",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  neutral: "border-black/10 bg-black/5 text-muted-foreground",
};

/**
 * Everything the API returned about the signed-in caller: identity, platform
 * role, account status, and their organization roles. Read-only and
 * server-rendered — it exists so authorization is visible, not implied.
 */
export function AccessSummary({ me }: { me: MeResponse }) {
  const platform = platformRole(me.platform_role);
  const status = accountStatus(me.account_status);

  return (
    <Card className="rounded-3xl border-black/10 bg-[#fffafa]/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <HugeiconsIcon
            icon={UserCheck01Icon}
            size={24}
            strokeWidth={1.5}
            className="text-brand-blue"
          />
          Your access
        </CardTitle>
        <CardDescription>
          What the API resolved for this session — your identity, platform role,
          and organization memberships.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-blue/10 text-brand-blue">
            <HugeiconsIcon icon={UserCircleIcon} size={22} strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{me.name || "Unnamed user"}</p>
            <p className="truncate text-sm text-muted-foreground">
              {me.email ?? "No email on file"}
            </p>
          </div>
        </div>

        <Separator />

        <dl className="grid gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <HugeiconsIcon icon={Shield01Icon} size={14} strokeWidth={1.5} />
              Platform role
            </dt>
            <dd className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={
                  toneClass[me.is_platform_admin ? "success" : "neutral"]
                }
              >
                {platform.label}
              </Badge>
              <code className="rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                {me.platform_role ?? "none"}
              </code>
            </dd>
            <p className="text-xs text-muted-foreground">
              {platform.description}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={1.5} />
              Account status
            </dt>
            <dd>
              <Badge variant="outline" className={toneClass[status.tone]}>
                {status.label}
              </Badge>
            </dd>
            <p className="text-xs text-muted-foreground">
              {me.is_platform_admin
                ? "Platform admins skip the approval queue."
                : "Only active accounts can read data."}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <HugeiconsIcon
                icon={BadgeCheckIcon}
                size={14}
                strokeWidth={1.5}
              />
              Email
            </dt>
            <dd>
              <Badge
                variant="outline"
                className={toneClass[me.email_verified ? "success" : "warning"]}
              >
                {me.email_verified ? "Verified" : "Unverified"}
              </Badge>
            </dd>
            <p className="text-xs text-muted-foreground">
              Verified by the emailed one-time code.
            </p>
          </div>
        </dl>

        <Separator />

        <div className="flex flex-col gap-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <HugeiconsIcon icon={Building03Icon} size={16} strokeWidth={1.5} />
            Organizations
            <span className="font-normal text-muted-foreground">
              ({me.memberships.length})
            </span>
          </h2>

          {me.memberships.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-black/10 px-6 py-8 text-center">
              <HugeiconsIcon
                icon={UserSearch01Icon}
                size={24}
                strokeWidth={1.5}
                className="text-muted-foreground"
              />
              <p className="text-sm text-muted-foreground">
                You don&apos;t belong to an organization yet. An owner or admin
                adds members by email.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {me.memberships.map((membership) => {
                const role = orgRole(membership.role_slug);
                const membershipStatus = accountStatus(membership.status);

                return (
                  <li
                    key={membership.organization_id}
                    className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {membership.organization_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {role.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={toneClass.neutral}>
                        <span className="font-mono">{role.slug}</span>
                      </Badge>
                      <Badge
                        variant="outline"
                        className={toneClass[membershipStatus.tone]}
                      >
                        {membershipStatus.label}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {me.is_platform_admin && (
          <>
            <Separator />
            <Link
              href="/admin/users"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-black/10 bg-[#fffafa]/70 px-4 py-2.5 text-sm font-medium text-brand-blue underline-offset-4 hover:underline"
            >
              <HugeiconsIcon
                icon={UserCheck01Icon}
                size={16}
                strokeWidth={1.5}
              />
              Review pending accounts
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
