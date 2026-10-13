"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormMessage } from "@/components/auth-message";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  approveOrganization,
  cancelOrganization,
  deleteOrganization,
} from "@/lib/api/actions";
import type { OrganizationItem } from "@/lib/api/types";
import {
  ADMIN_DATE_FORMATTER,
  ORGANIZATION_STATUS_FILTERS,
  type AdminOrganizationsProps,
  type OrganizationStatusFilter,
} from "@/lib/data/admin";
import { BADGE_TONE_CLASSES, accountStatus } from "@/lib/data/roles";
import {
  Building03Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  RefreshIcon,
  TrashIcon,
  UserSearch01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type OrgConfirmAction = "approve" | "cancel" | "delete";

interface PendingActionState {
  org: OrganizationItem;
  type: OrgConfirmAction;
}

export function AdminOrganizations({ organizations }: AdminOrganizationsProps) {
  const router = useRouter();
  const [list, setList] = useState<OrganizationItem[]>(organizations ?? []);
  const [activeFilter, setActiveFilter] =
    useState<OrganizationStatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingActionState | null>(
    null,
  );

  const filtered = list.filter((org) => {
    if (activeFilter === "all") return true;
    return org.status === activeFilter;
  });

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

        setList((current) =>
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

        setList((current) =>
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

        setList((current) => current.filter((item) => item.id !== org.id));
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
      <Reveal variant="fade-up">
        <Card className="rounded-3xl border-black/10 bg-[#fffafa]/70">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                  <HugeiconsIcon
                    icon={Building03Icon}
                    size={24}
                    strokeWidth={1.5}
                    className="text-brand-blue"
                  />
                  Organizations
                </CardTitle>
                <CardDescription>
                  Manage all workspaces across the platform in any status.
                </CardDescription>
              </div>

              {/* Status filter pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {ORGANIZATION_STATUS_FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActiveFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      activeFilter === f
                        ? "bg-brand-blue text-white shadow-sm"
                        : "bg-black/5 text-muted-foreground hover:bg-black/10"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {error && <FormMessage tone="error">{error}</FormMessage>}

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/10 px-6 py-10 text-center">
                <HugeiconsIcon
                  icon={UserSearch01Icon}
                  size={28}
                  strokeWidth={1.5}
                  className="text-muted-foreground"
                />
                <p className="text-sm text-muted-foreground">
                  No organizations found
                  {activeFilter !== "all"
                    ? ` with status "${activeFilter}"`
                    : ""}
                  .
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl text-brand-blue"
                  onClick={() => router.refresh()}
                >
                  <HugeiconsIcon
                    icon={RefreshIcon}
                    size={16}
                    strokeWidth={1.5}
                  />
                  Refresh
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {filtered.map((org) => {
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
                        <p className="mt-1 text-xs text-muted-foreground">
                          Created{" "}
                          {ADMIN_DATE_FORMATTER.format(
                            new Date(org.created_at),
                          )}
                          {org.approved_at
                            ? ` · Approved ${ADMIN_DATE_FORMATTER.format(new Date(org.approved_at))}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant="outline"
                          className={BADGE_TONE_CLASSES[orgStatus.tone]}
                        >
                          {orgStatus.label}
                        </Badge>

                        {org.status === "pending" && (
                          <Button
                            type="button"
                            className="rounded-xl shadow-lg shadow-brand-green/25"
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
                            className="rounded-xl shadow-lg shadow-brand-green/25"
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
          </CardContent>
        </Card>
      </Reveal>

      {/* Confirmation Dialog */}
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
                  : "This will permanently delete this organization and remove it from everywhere, including Neon Auth and all workspace memberships. This action cannot be undone."}
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
                  ? "rounded-3xl bg-brand-green text-white hover:bg-brand-green/90 shadow-lg shadow-brand-green/25"
                  : pendingAction?.type === "cancel"
                    ? "rounded-3xl bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/25"
                    : "rounded-3xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/25"
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
    </div>
  );
}
