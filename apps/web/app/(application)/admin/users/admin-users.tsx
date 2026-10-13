"use client";

import {
  Building03Icon,
  CheckmarkCircle02Icon,
  RefreshIcon,
  TrashIcon,
  UserCheck01Icon,
  UserRemove01Icon,
  UserSearch01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormMessage } from "@/components/auth-message";
import { Reveal } from "@/components/motion/reveal";
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
import { decideUser, deleteUser } from "@/lib/api/actions";
import type { PendingUser } from "@/lib/api/types";
import {
  ADMIN_DATE_FORMATTER,
  type AdminUsersProps,
  type PendingUserAction,
} from "@/lib/data/admin";

export function AdminUsers({ users }: AdminUsersProps) {
  const router = useRouter();
  const [queue, setQueue] = useState<PendingUser[]>(users ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(
    null,
  );

  async function decide(user: PendingUser, action: "approve" | "reject") {
    setError(null);
    setBusyId(user.user_id);

    try {
      const result = await decideUser({
        userId: user.user_id,
        decision: action,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setQueue((current) =>
        current.filter((entry) => entry.user_id !== user.user_id),
      );
      router.refresh();
    } catch {
      setError(
        action === "approve"
          ? "Could not approve that account. Please try again."
          : "Could not decline that account. Please try again.",
      );
    } finally {
      setBusyId(null);
      setPendingAction(null);
    }
  }

  async function remove(user: PendingUser) {
    setError(null);
    setBusyId(user.user_id);

    try {
      const result = await deleteUser({
        userId: user.user_id,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setQueue((current) =>
        current.filter((entry) => entry.user_id !== user.user_id),
      );
      router.refresh();
    } catch {
      setError("Could not delete that account. Please try again.");
    } finally {
      setBusyId(null);
      setPendingAction(null);
    }
  }

  function handleConfirm() {
    if (!pendingAction) return;
    const { user, type } = pendingAction;
    if (type === "delete") {
      void remove(user);
    } else {
      void decide(user, type);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
      {/* Admin Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-black/10 pb-3">
        <Link href="/admin/users">
          <Button
            variant="default"
            className="rounded-xl bg-brand-blue text-white hover:bg-brand-blue/90"
          >
            <HugeiconsIcon icon={UserCheck01Icon} size={16} strokeWidth={1.5} />
            Users
          </Button>
        </Link>
        <Link href="/admin/organizations">
          <Button
            variant="ghost"
            className="rounded-xl text-muted-foreground hover:text-foreground"
          >
            <HugeiconsIcon icon={Building03Icon} size={16} strokeWidth={1.5} />
            Organizations
          </Button>
        </Link>
      </div>

      <Reveal variant="fade-up">
        <Card className="rounded-3xl border-black/10 bg-[#fffafa]/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <HugeiconsIcon
                icon={UserCheck01Icon}
                size={24}
                strokeWidth={1.5}
                className="text-brand-blue"
              />
              Account approvals
            </CardTitle>
            <CardDescription>
              New sign-ups stay locked until you grant access.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {error && <FormMessage tone="error">{error}</FormMessage>}

            {queue.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/10 px-6 py-10 text-center">
                <HugeiconsIcon
                  icon={UserSearch01Icon}
                  size={28}
                  strokeWidth={1.5}
                  className="text-muted-foreground"
                />
                <p className="text-sm text-muted-foreground">
                  No accounts are waiting for approval.
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
                {queue.map((user) => {
                  const busy = busyId === user.user_id;

                  return (
                    <li
                      key={user.user_id}
                      className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {user.name || "Unnamed user"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {user.email ?? "no email"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Requested{" "}
                          {ADMIN_DATE_FORMATTER.format(
                            new Date(user.created_at),
                          )}
                          {user.email_verified ? " · email verified" : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={busy}
                          onClick={() =>
                            setPendingAction({ user, type: "delete" })
                          }
                          title="Permanently delete this account"
                        >
                          <HugeiconsIcon
                            icon={TrashIcon}
                            size={16}
                            strokeWidth={1.5}
                          />
                          Delete
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          disabled={busy}
                          onClick={() =>
                            setPendingAction({ user, type: "reject" })
                          }
                        >
                          <HugeiconsIcon
                            icon={UserRemove01Icon}
                            size={16}
                            strokeWidth={1.5}
                          />
                          Decline
                        </Button>
                        <Button
                          type="button"
                          className="rounded-xl shadow-lg shadow-brand-green/25"
                          disabled={busy}
                          onClick={() =>
                            setPendingAction({ user, type: "approve" })
                          }
                        >
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            size={16}
                            strokeWidth={1.5}
                          />
                          Approve
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
              {pendingAction?.type === "delete"
                ? "Delete account"
                : pendingAction?.type === "reject"
                  ? "Decline account"
                  : "Approve account"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.type === "delete"
                ? "This will permanently delete the account and all related data. This action cannot be undone."
                : pendingAction?.type === "reject"
                  ? "This will decline the account. The user will not be able to access the system."
                  : "This will approve the account and grant access to the system."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-black/5 p-4 text-sm">
            <p className="font-medium">
              {pendingAction?.user.name || "Unnamed user"}
            </p>
            <p className="text-muted-foreground">
              {pendingAction?.user.email ?? "No email"}
            </p>
          </div>
          <DialogFooter>
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
              className={`rounded-3xl ${
                pendingAction?.type === "delete" ||
                pendingAction?.type === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }`}
              disabled={!!busyId}
              onClick={handleConfirm}
            >
              {pendingAction?.type === "delete"
                ? busyId
                  ? "Deleting..."
                  : "Delete"
                : pendingAction?.type === "reject"
                  ? busyId
                    ? "Declining..."
                    : "Decline"
                  : busyId
                    ? "Approving..."
                    : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
