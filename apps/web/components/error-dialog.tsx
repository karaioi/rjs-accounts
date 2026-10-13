"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ErrorDialogProps } from "@/lib/data/auth";

/**
 * Modal shown when an auth step fails. Auth errors are surfaced here (rather
 * than inline) so the reason is impossible to miss; `message` also drives
 * visibility, so callers just pass their `error` state.
 */
export function ErrorDialog({ title, message, onClose }: ErrorDialogProps) {
  return (
    <Dialog
      open={message !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <span className="grid size-10 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <HugeiconsIcon icon={Alert02Icon} size={20} strokeWidth={1.5} />
          </span>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-destructive/90">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" className="rounded-xl" onClick={onClose}>
            Try again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
