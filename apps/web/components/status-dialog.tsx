"use client";

import {
  AlertCircleIcon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  UserSearch01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type PendingStatus,
  STATUS_CONFIG,
  type StatusDialogProps,
} from "@/lib/data/pending";

export function StatusDialog({ open, onClose, result }: StatusDialogProps) {
  if (!result) return null;

  const currentStatus = result.status as PendingStatus;
  const config = STATUS_CONFIG[currentStatus];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center sm:text-center">
          <span
            className={
              config.tone === "success"
                ? "grid size-14 place-items-center rounded-2xl bg-brand-green/10 text-brand-green mb-2"
                : config.tone === "destructive"
                  ? "grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive mb-2"
                  : config.tone === "warning"
                    ? "grid size-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-700 mb-2"
                    : "grid size-14 place-items-center rounded-2xl bg-black/5 text-muted-foreground mb-2"
            }
          >
            <HugeiconsIcon
              icon={
                currentStatus === "active"
                  ? CheckmarkCircle01Icon
                  : currentStatus === "pending"
                    ? Clock01Icon
                    : currentStatus === "not_found"
                      ? UserSearch01Icon
                      : AlertCircleIcon
              }
              size={28}
              strokeWidth={1.5}
            />
          </span>

          <DialogTitle className="text-xl font-bold tracking-tight">
            {config.title}
          </DialogTitle>

          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant={
                config.tone === "success"
                  ? "default"
                  : config.tone === "destructive"
                    ? "destructive"
                    : "secondary"
              }
              className="capitalize"
            >
              {currentStatus.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground break-all">
              {result.email}
            </span>
          </div>

          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-col">
          {config.actionLabel && config.actionHref && (
            <Link href={config.actionHref} className="w-full">
              <Button
                variant={config.tone === "success" ? "default" : "outline"}
                className="w-full rounded-xl"
              >
                {config.actionLabel}
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  strokeWidth={1.5}
                />
              </Button>
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full rounded-xl text-muted-foreground"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
