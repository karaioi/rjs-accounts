"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FormMessage } from "@/components/auth-message";
import {
  approveOrganization,
  cancelOrganization,
  deleteOrganization,
} from "@/lib/api/actions";
import type { OrganizationItem } from "@/lib/api/types";
import { ADMIN_DATE_FORMATTER } from "@/lib/data/admin";
import {
  BADGE_TONE_CLASSES,
  accountStatus,
  platformRole,
  type AccessSummaryProps,
} from "@/lib/data/roles";
import {
  BadgeCheckIcon,
  Building03Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Shield01Icon,
  TrashIcon,
  UserSearch01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type OrgConfirmAction = "approve" | "cancel" | "delete";

interface PendingActionState {
  org: OrganizationItem;
  type: OrgConfirmAction;
}

/**
 * Everything the API returned about the signed-in caller: identity, platform
 * role, account status, and their organization roles.
 * For platform admins, displays all organizations across any status with
 * complete management (approve pending, cancel/suspend, permanently delete from app and Neon Auth).
 */
export function AccessSummary({ me, organizations }: AccessSummaryProps) {
  const router = useRouter();
  const platform = platformRole(me.platform_role);
  const status = accountStatus(me.account_status);

  const [orgList, setOrgList] = useState<OrganizationItem[]>(
    organizations ?? [],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingActionState | null>(
    null,
  );

  async function handleConfirmAction() {
    if (!pendingAction) return;
    const { org, type } = pendingAction;
    setError(null);
    setBusyId(org.id);

    try {
      if (type === "approve") {
        const res = await approveOrganization({ organizationId: org.id });
        if (!res.ok) {
          setError(res.message);
          return;
        }
        setOrgList((current) =>
          current.map((item) =>
            item.id === org.id
              ? {
                  ...item,
                  status: "active",
                  approved_at: new Date().toISOString(),
                }
              : item,
          ),
        );
      } else if (type === "cancel") {
        const res = await cancelOrganization({ organizationId: org.id });
        if (!res.ok) {
          setError(res.message);
          return;
        }
        setOrgList((current) =>
          current.map((item) =>
            item.id === org.id
              ? {
                  ...item,
                  status: "suspended",
                }
              : item,
          ),
        );
      } else if (type === "delete") {
        const res = await deleteOrganization({ organizationId: org.id });
        if (!res.ok) {
          setError(res.message);
          return;
        }
        setOrgList((current) => current.filter((item) => item.id !== org.id));
      }

      setPendingAction(null);
      router.refresh();
    } catch {
      setError(
        type === "approve"
          ? "Could not approve that organization. Please try again."
          : type === "cancel"
            ? "Could not cancel that organization. Please try again."
            : "Could not delete that organization. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Card className="rounded-3xl border-black/10 bg-[#fffafa]/70">
        <CardContent className="flex flex-col gap-6">
          <dl className="grid gap-5 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 rounded-2xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white">
              <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-white/70 uppercase">
                <HugeiconsIcon
                  icon={Shield01Icon}
                  size={14}
                  strokeWidth={1.5}
                />
                Platform role
              </dt>
              <dd className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-brand-green bg-brand-green text-white"
                >
                  {platform.label}
                </Badge>
                <code className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white/80">
                  {me.platform_role ?? "none"}
                </code>
              </dd>
              <p className="text-xs text-white/70">{platform.description}</p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-2xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white">
              <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-white/70 uppercase">
                <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={1.5} />
                Account status
              </dt>
              <dd>
                <Badge
                  variant="outline"
                  className={`border-white/30 bg-white/10 text-white ${
                    status.tone === "success"
                      ? "border-brand-green bg-brand-green text-white"
                      : status.tone === "warning"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                        : status.tone === "danger"
                          ? "border-destructive/25 bg-destructive/10 text-destructive"
                          : ""
                  }`}
                >
                  {status.label}
                </Badge>
              </dd>
              <p className="text-xs text-white/70">
                {me.is_platform_admin
                  ? "Platform admins skip the approval queue."
                  : "Only active accounts can read data."}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-2xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white">
              <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-white/70 uppercase">
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
                  className={
                    me.email_verified
                      ? "border-brand-green bg-brand-green text-white"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                  }
                >
                  {me.email_verified ? "Verified" : "Unverified"}
                </Badge>
              </dd>
              <p className="text-xs text-white/70">
                Verified by the emailed one-time code.
              </p>
            </div>
          </dl>

          <Separator />

          {error && <FormMessage tone="error">{error}</FormMessage>}

          {/* Organizations section - platform admin only */}
          {me.is_platform_admin && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <HugeiconsIcon
                    icon={Building03Icon}
                    size={16}
                    strokeWidth={1.5}
                  />
                  Organizations (All Workspaces)
                  <span className="font-normal text-muted-foreground">
                    ({orgList.length})
                  </span>
                </h2>
                <span className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-medium text-brand-blue">
                  Admin view · Any status
                </span>
              </div>

              {orgList.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-black/10 px-6 py-8 text-center">
                  <HugeiconsIcon
                    icon={UserSearch01Icon}
                    size={24}
                    strokeWidth={1.5}
                    className="text-muted-foreground"
                  />
                  <p className="text-sm text-muted-foreground">
                    No organizations found. Organizations in any status will
                    appear here.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {orgList.map((org) => {
                    const orgStatus = accountStatus(org.status);
                    const busy = busyId === org.id;

                    return (
                      <li
                        key={org.id}
                        className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{org.name}</p>
                            <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                              {org.slug}
                            </code>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            Created{" "}
                            {ADMIN_DATE_FORMATTER.format(
                              new Date(org.created_at),
                            )}
                            {org.approved_at
                              ? ` · Approved ${ADMIN_DATE_FORMATTER.format(new Date(org.approved_at))}`
                              : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={BADGE_TONE_CLASSES[orgStatus.tone]}
                          >
                            {orgStatus.label}
                          </Badge>

                          {org.status === "pending" && (
                            <Button
                              type="button"
                              className="rounded-xl shadow-sm shadow-brand-green/20"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                setPendingAction({ org, type: "approve" })
                              }
                            >
                              <HugeiconsIcon
                                icon={CheckmarkCircle02Icon}
                                size={14}
                                strokeWidth={1.5}
                              />
                              Approve
                            </Button>
                          )}

                          {org.status === "suspended" && (
                            <Button
                              type="button"
                              className="rounded-xl shadow-sm shadow-brand-green/20"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                setPendingAction({ org, type: "approve" })
                              }
                            >
                              <HugeiconsIcon
                                icon={CheckmarkCircle02Icon}
                                size={14}
                                strokeWidth={1.5}
                              />
                              Reactivate
                            </Button>
                          )}

                          {(org.status === "pending" ||
                            org.status === "active") && (
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-xl border-amber-500/30 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                setPendingAction({ org, type: "cancel" })
                              }
                              title="Cancel or suspend organization"
                            >
                              <HugeiconsIcon
                                icon={Cancel01Icon}
                                size={14}
                                strokeWidth={1.5}
                              />
                              Cancel
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              setPendingAction({ org, type: "delete" })
                            }
                            title="Permanently delete from app and Neon Auth"
                          >
                            <HugeiconsIcon
                              icon={TrashIcon}
                              size={14}
                              strokeWidth={1.5}
                            />
                            Delete
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog for organization actions */}
      <Dialog
        open={!!pendingAction}
        onOpenChange={(open) => {
          if (!open && !busyId) {
            setPendingAction(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.type === "approve"
                ? "Approve organization"
                : pendingAction?.type === "cancel"
                  ? "Cancel organization"
                  : "Delete organization"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.type === "approve"
                ? "This will activate the organization and allow its members to sign in and access workspace features."
                : pendingAction?.type === "cancel"
                  ? "This will cancel and suspend the organization. Its members will immediately lose access until re-approved."
                  : "This will permanently delete this organization and remove it from everywhere, including Neon Auth and workspace memberships. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          {pendingAction && (
            <div className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-black/5 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium text-slate-900">
                  {pendingAction.org.name}
                </p>
                <Badge
                  variant="outline"
                  className={
                    BADGE_TONE_CLASSES[
                      accountStatus(pendingAction.org.status).tone
                    ]
                  }
                >
                  {accountStatus(pendingAction.org.status).label}
                </Badge>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                Slug: {pendingAction.org.slug} · ID: {pendingAction.org.id}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-3xl"
              disabled={!!busyId}
              onClick={() => setPendingAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={
                pendingAction?.type === "approve"
                  ? "rounded-3xl bg-brand-green text-white hover:bg-brand-green/90 shadow-md shadow-brand-green/20"
                  : pendingAction?.type === "cancel"
                    ? "rounded-3xl bg-amber-600 text-white hover:bg-amber-700 shadow-md shadow-amber-600/20"
                    : "rounded-3xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/20"
              }
              disabled={!!busyId}
              onClick={handleConfirmAction}
            >
              {busyId
                ? pendingAction?.type === "approve"
                  ? "Approving..."
                  : pendingAction?.type === "cancel"
                    ? "Canceling..."
                    : "Deleting..."
                : pendingAction?.type === "approve"
                  ? "Approve organization"
                  : pendingAction?.type === "cancel"
                    ? "Cancel organization"
                    : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
