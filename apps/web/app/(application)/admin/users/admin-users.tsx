"use client";

import {
  CheckmarkCircle02Icon,
  RefreshIcon,
  UserCheck01Icon,
  UserRemove01Icon,
  UserSearch01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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

export interface PendingUser {
  user_id: string;
  email: string | null;
  name: string | null;
  account_status: string;
  email_verified: boolean;
  created_at: string;
  approved_at: string | null;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function AdminUsers({
  users,
  gateRequired = false,
}: {
  users: PendingUser[] | null;
  gateRequired?: boolean;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<PendingUser[]>(users ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(user: PendingUser, action: "approve" | "reject") {
    setError(null);
    setBusyId(user.user_id);

    try {
      const response = await fetch(
        `/api/backend/users/${user.user_id}/${action}`,
        { method: "POST" },
      );

      if (!response.ok) {
        setError(
          action === "approve"
            ? "Could not approve that account. Please try again."
            : "Could not decline that account. Please try again.",
        );
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
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
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
            {gateRequired && (
              <FormMessage tone="error">
                Your sign-in is missing its email-verification step. Sign in
                again before reviewing accounts.
              </FormMessage>
            )}

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
                          {dateFormatter.format(new Date(user.created_at))}
                          {user.email_verified ? " · email verified" : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          disabled={busy}
                          onClick={() => decide(user, "reject")}
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
                          onClick={() => decide(user, "approve")}
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
    </div>
  );
}
