"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { FormMessage } from "@/components/auth-message";
import { deleteCustomer } from "@/lib/api/actions";
import type { Customer } from "@/lib/api/types";
import type { CustomersProps } from "@/lib/data/customers";
import { CustomerDeleteDialog } from "./components/customer-delete-dialog";
import { CustomerDetail } from "./components/customer-detail";
import { CustomerList } from "./components/customer-list";
import { CustomerSheet } from "./components/customer-sheet";

export function Customers({
  customers,
  total,
  page,
  totalPages,
  search,
  isAdmin = false,
  organizations = [],
  selectedOrgId = "",
}: CustomersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [pendingDeleteCustomer, setPendingDeleteCustomer] =
    useState<Customer | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // First row is auto-clicked by default
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    customers[0]?.id ?? null,
  );

  // Active customer falls back to first customer in list
  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) ?? customers[0] ?? null;

  function navigateTo(paramsUpdate: {
    page?: number;
    search?: string;
    orgId?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    if (paramsUpdate.page !== undefined) {
      params.set("page", String(paramsUpdate.page));
    }
    if (paramsUpdate.search !== undefined) {
      if (paramsUpdate.search) {
        params.set("search", paramsUpdate.search);
      } else {
        params.delete("search");
      }
    }
    if (paramsUpdate.orgId !== undefined) {
      if (paramsUpdate.orgId) {
        params.set("organization_id", paramsUpdate.orgId);
      } else {
        params.delete("organization_id");
      }
    }
    startTransition(() => {
      router.push(`/customers?${params.toString()}`);
    });
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteCustomer) return;
    setError(null);
    setBusyDelete(true);
    try {
      const res = await deleteCustomer({
        customerId: pendingDeleteCustomer.id,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setPendingDeleteCustomer(null);
      if (selectedCustomerId === pendingDeleteCustomer.id) {
        setSelectedCustomerId(null);
      }
      router.refresh();
    } catch {
      setError("Could not delete that customer. Please try again.");
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col p-2 overflow-hidden min-h-0">
      {error && (
        <div className="shrink-0 mb-3">
          <FormMessage tone="error">{error}</FormMessage>
        </div>
      )}

      {/* Unified Split-Screen Surface (fits height; only inner panes scroll) */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row w-full rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
        {/* Left Split: Customer Rows List */}
        <CustomerList
          customers={customers}
          total={total}
          page={page}
          totalPages={totalPages}
          search={search}
          isAdmin={isAdmin}
          organizations={organizations}
          selectedOrgId={selectedOrgId}
          selectedCustomerId={selectedCustomer?.id ?? null}
          onSelectCustomer={setSelectedCustomerId}
          onAddCustomer={() => {
            setEditingCustomer(null);
            setSheetOpen(true);
          }}
          onNavigate={navigateTo}
        />

        {/* Right Split: Clicked Customer Details */}
        <CustomerDetail
          customer={selectedCustomer}
          isAdmin={isAdmin}
          onEdit={() => {
            if (selectedCustomer) {
              setEditingCustomer(selectedCustomer);
              setSheetOpen(true);
            }
          }}
          onDelete={() => {
            if (selectedCustomer) {
              setPendingDeleteCustomer(selectedCustomer);
            }
          }}
        />
      </div>

      {/* Sheet for Add / Edit Customer */}
      <CustomerSheet
        isOpen={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setEditingCustomer(null);
          }
        }}
        editingCustomer={editingCustomer}
        isAdmin={isAdmin}
        organizations={organizations}
        onDone={() => {
          setSheetOpen(false);
          setEditingCustomer(null);
          router.refresh();
        }}
        onError={setError}
      />

      {/* Confirmation Dialog for Delete */}
      <CustomerDeleteDialog
        customer={pendingDeleteCustomer}
        isOpen={!!pendingDeleteCustomer}
        isBusy={busyDelete}
        onClose={() => setPendingDeleteCustomer(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
