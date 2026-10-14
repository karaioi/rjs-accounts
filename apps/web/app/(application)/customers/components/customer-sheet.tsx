"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Customer } from "@/lib/api/types";
import { AddCustomerForm } from "../add-customer-form";

interface CustomerSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomer: Customer | null;
  isAdmin?: boolean;
  organizations?: { id: string; name: string; slug: string }[];
  onDone: () => void;
  onError: (message: string) => void;
}

export function CustomerSheet({
  isOpen,
  onOpenChange,
  editingCustomer,
  isAdmin = false,
  organizations = [],
  onDone,
  onError,
}: CustomerSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {editingCustomer ? "Edit customer" : "Add customer"}
          </SheetTitle>
          <SheetDescription>
            {editingCustomer
              ? "Update this customer's details and contact information."
              : isAdmin
                ? "Create a new customer for an organization."
                : "Create a new customer in your workspace."}
          </SheetDescription>
        </SheetHeader>
        <AddCustomerForm
          key={editingCustomer?.id ?? "new"}
          initialData={editingCustomer}
          isAdmin={isAdmin}
          organizations={organizations}
          onDone={onDone}
          onError={onError}
        />
      </SheetContent>
    </Sheet>
  );
}
