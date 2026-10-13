"use client";

import { useState } from "react";
import Link from "next/link";
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
import { approveOrganization, deleteOrganization } from "@/lib/api/actions";
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
  CheckmarkCircle02Icon,
  RefreshIcon,
  TrashIcon,
  UserCheck01Icon,
  UserSearch01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function AdminOrganizations({ organizations }: AdminOrganizationsProps) {
  const router = useRouter();
  const [list, setList] = useState<OrganizationItem[]>(organizations ?? []);
  const [activeFilter, setActiveFilter] =
    useState<OrganizationStatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OrganizationItem | null>(
    null,
  );

  const filtered = list.filter((org) => {
    if (activeFilter === "all") return true;
    return org.status === activeFilter;
  });

  async function handleApprove(org: OrganizationItem) {
    setError(null);
    setBusyId(org.id);

    try {
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
      router.refresh();
    } catch {
      setError("Could not approve that organization. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) return;
    const org = pendingDelete;
    setError(null);
    setBusyId(org.id);

    try {
      const res = await deleteOrganization({ organizationId: org.id });
      if (!res.ok) {
        setError(res.message);
        return;
      }

      setList((current) => current.filter((item) => item.id !== org.id));
      setPendingDelete(null);
      router.refresh();
    } catch {
      setError("Could not delete that organization. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
      {/* Admin Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-black/10 pb-3">
        <Link href="/admin/users">
          <Button
            variant="ghost"
            className="rounded-xl text-muted-foreground hover:text-foreground"
          >
            <HugeiconsIcon icon={UserCheck01Icon} size={16} strokeWidth={1.5} />
            Users
          </Button>
        </Link>
        <Link href="/admin/organizations">
          <Button
            variant="default"
            className="rounded-xl bg-brand-blue text-white hover:bg-brand-blue/90"
          >
            <HugeiconsIcon icon={Building03Icon} size={16} strokeWidth={1.5} />
            Organizations
          </Button>
        </Link>
      </div>

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
                            onClick={() => handleApprove(org)}
                          >
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              size={14}
                              strokeWidth={1.5}
                            />
                            Approve
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          size="sm"
                          disabled={busy}
                          onClick={() => setPendingDelete(org)}
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
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !busyId) {
            setPendingDelete(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete organization</DialogTitle>
            <DialogDescription>
              This will permanently delete this organization and remove it from
              everywhere, including Neon Auth and all workspace memberships.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {pendingDelete && (
            <div className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-black/5 p-4 text-sm">
              <p className="font-medium text-slate-900">{pendingDelete.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                Slug: {pendingDelete.slug} · Status: {pendingDelete.status}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-3xl"
              disabled={!!busyId}
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-3xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!busyId}
              onClick={handleDeleteConfirm}
            >
              {busyId ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
