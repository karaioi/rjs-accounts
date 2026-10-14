"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Customer } from "@/lib/api/types";

interface CustomerDeleteDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  isBusy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CustomerDeleteDialog({
  customer,
  isOpen,
  isBusy,
  onClose,
  onConfirm,
}: CustomerDeleteDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isBusy) {
          onClose();
        }
      }}
    >
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Delete customer</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete this customer? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {customer && (
          <div className="flex flex-col gap-1.5 rounded-2xl border border-black/5 bg-black/5 p-4 text-sm">
            <p className="font-semibold text-slate-900">
              {customer.company_name || customer.name}
            </p>
            {customer.gstin && (
              <p className="font-mono text-xs text-muted-foreground">
                GSTIN: {customer.gstin}
              </p>
            )}
            {customer.organization_name && (
              <p className="text-xs text-muted-foreground">
                Organization: {customer.organization_name}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-3xl"
            disabled={isBusy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-3xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/20"
            disabled={isBusy}
            onClick={onConfirm}
          >
            {isBusy ? "Deleting…" : "Delete customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
