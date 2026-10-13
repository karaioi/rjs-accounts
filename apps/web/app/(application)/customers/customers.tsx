"use client";

import {
  Add01Icon,
  Building03Icon,
  Edit01Icon,
  Search01Icon,
  TrashIcon,
  UserSearch01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteCustomer } from "@/lib/api/actions";
import type { Customer } from "@/lib/api/types";
import {
  CUSTOMER_TABLE_HEADERS,
  type CustomersProps,
} from "@/lib/data/customers";
import { AddCustomerForm } from "./add-customer-form";

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
      router.refresh();
    } catch {
      setError("Could not delete that customer. Please try again.");
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-8">
      <Reveal variant="fade-up">
        <Card className="rounded-3xl border-black/10 bg-[#fffafa]/70">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-3xl bg-brand-blue/10 text-brand-blue">
                <HugeiconsIcon
                  icon={Building03Icon}
                  size={22}
                  strokeWidth={1.5}
                />
              </span>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Customers
                </CardTitle>
                <CardDescription>
                  {isAdmin
                    ? "Manage customer directory across all organizations."
                    : "Manage your organization's customer directory and contacts."}
                </CardDescription>
              </div>
            </div>

            <Button
              className="rounded-3xl shadow-lg shadow-brand-green/25"
              onClick={() => {
                setEditingCustomer(null);
                setSheetOpen(true);
              }}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.5} />
              Add customer
            </Button>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {error && <FormMessage tone="error">{error}</FormMessage>}

            {/* Filter and Search Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={18}
                  strokeWidth={1.5}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  placeholder="Search by name, company, GSTIN, or email…"
                  defaultValue={search}
                  onChange={(e) =>
                    navigateTo({ page: 1, search: e.target.value })
                  }
                  className="h-11 rounded-3xl pl-10"
                />
              </div>

              {isAdmin && organizations.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                    Organization:
                  </span>
                  <select
                    value={selectedOrgId}
                    onChange={(e) =>
                      navigateTo({ page: 1, orgId: e.target.value })
                    }
                    className="h-11 rounded-3xl border border-input bg-transparent px-3.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">All organizations</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-3xl border border-black/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-black/3 hover:bg-black/3">
                    {CUSTOMER_TABLE_HEADERS.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                    {isAdmin && <TableHead>Organization</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {customers.map((customer, index) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          {(page - 1) * 20 + index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {customer.company_name ?? "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {customer.name}
                        </TableCell>
                        <TableCell>
                          {customer.gstin ? (
                            <code className="rounded-3xl bg-black/5 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                              {customer.gstin}
                            </code>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.email ? (
                            <span className="text-xs text-muted-foreground">
                              {customer.email}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.contact_mobile ||
                          customer.contact_telephone ? (
                            <span className="text-xs text-muted-foreground">
                              {[
                                customer.contact_mobile,
                                customer.contact_telephone,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {customer.place_of_supply ||
                              customer.location ||
                              customer.state ||
                              "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {customer.opening_balance ? (
                            <span className="text-xs font-mono text-muted-foreground">
                              {customer.opening_balance}{" "}
                              {customer.opening_balance_type ? (
                                <span className="uppercase text-[10px]">
                                  ({customer.opening_balance_type})
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="border-brand-blue/30 bg-brand-blue/10 text-brand-blue text-xs"
                            >
                              {customer.organization_name ?? "Unassigned"}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-8 rounded-xl p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingCustomer(customer);
                                setSheetOpen(true);
                              }}
                              title="Edit customer"
                            >
                              <HugeiconsIcon
                                icon={Edit01Icon}
                                size={15}
                                strokeWidth={1.5}
                              />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-8 rounded-xl p-0 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setPendingDeleteCustomer(customer)}
                              title="Delete customer"
                            >
                              <HugeiconsIcon
                                icon={TrashIcon}
                                size={15}
                                strokeWidth={1.5}
                              />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>

              {customers.length === 0 && (
                <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                  <HugeiconsIcon
                    icon={UserSearch01Icon}
                    size={28}
                    strokeWidth={1.5}
                    className="text-muted-foreground"
                  />
                  <p className="text-sm text-muted-foreground">
                    {search
                      ? "No customers match your search criteria."
                      : selectedOrgId
                        ? "No customers found for this organization."
                        : "No customers yet. Add your first customer."}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)}{" "}
                  of {total} customers
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-2xl"
                    disabled={page <= 1}
                    onClick={() => navigateTo({ page: page - 1 })}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-2xl"
                    disabled={page >= totalPages}
                    onClick={() => navigateTo({ page: page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>

      {/* Sheet for Add / Edit Customer */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setEditingCustomer(null);
          }
        }}
      >
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
            onDone={() => {
              setSheetOpen(false);
              setEditingCustomer(null);
              router.refresh();
            }}
            onError={setError}
          />
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={!!pendingDeleteCustomer}
        onOpenChange={(open) => {
          if (!open && !busyDelete) {
            setPendingDeleteCustomer(null);
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

          {pendingDeleteCustomer && (
            <div className="flex flex-col gap-1.5 rounded-2xl border border-black/5 bg-black/5 p-4 text-sm">
              <p className="font-semibold text-slate-900">
                {pendingDeleteCustomer.company_name ||
                  pendingDeleteCustomer.name}
              </p>
              {pendingDeleteCustomer.gstin && (
                <p className="font-mono text-xs text-muted-foreground">
                  GSTIN: {pendingDeleteCustomer.gstin}
                </p>
              )}
              {pendingDeleteCustomer.organization_name && (
                <p className="text-xs text-muted-foreground">
                  Organization: {pendingDeleteCustomer.organization_name}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-3xl"
              disabled={busyDelete}
              onClick={() => setPendingDeleteCustomer(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-3xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/20"
              disabled={busyDelete}
              onClick={handleConfirmDelete}
            >
              {busyDelete ? "Deleting…" : "Delete customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
