"use client";

import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Location01Icon,
  Search01Icon,
  UserSearch01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/api/types";
import { CustomerAvatar, CustomerStatusBadge } from "./customer-avatar";

interface CustomerListProps {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  isAdmin?: boolean;
  organizations?: { id: string; name: string; slug: string }[];
  selectedOrgId?: string;
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string) => void;
  onAddCustomer: () => void;
  onNavigate: (update: {
    page?: number;
    search?: string;
    orgId?: string;
  }) => void;
}

export function CustomerList({
  customers,
  total,
  page,
  totalPages,
  search,
  isAdmin = false,
  organizations = [],
  selectedOrgId = "",
  selectedCustomerId,
  onSelectCustomer,
  onAddCustomer,
  onNavigate,
}: CustomerListProps) {
  return (
    <div className="flex flex-col w-full lg:w-105 xl:w-112.5 shrink-0 h-full border-b lg:border-b-0 lg:border-r border-black/10 bg-white min-h-0">
      {/* Left Split Header: Fixed Search & Add Customer */}
      <div className="h-16 shrink-0 flex items-center gap-2.5 px-3.5 border-b border-black/10 bg-white">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            placeholder="Search name, email, or company…"
            defaultValue={search}
            onChange={(e) => onNavigate({ page: 1, search: e.target.value })}
            className="h-9 w-full rounded-full border border-black/10 bg-black/2 pl-9 pr-3 text-xs outline-none transition"
          />
        </div>

        {isAdmin && organizations.length > 0 && (
          <select
            value={selectedOrgId}
            onChange={(e) => onNavigate({ page: 1, orgId: e.target.value })}
            className="h-9 rounded-full border border-black/10 bg-black/2 px-2.5 text-xs outline-none"
          >
            <option value="">All Orgs</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}

        <Button
          size="sm"
          className="h-9 rounded-full px-3 text-xs gap-1 shadow-sm bg-brand-green hover:bg-brand-green/90"
          onClick={onAddCustomer}
        >
          <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.5} />
          Add
        </Button>
      </div>

      {/* Left Split Body: SCROLLABLE Customer Rows */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-black/5">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <HugeiconsIcon
              icon={UserSearch01Icon}
              size={32}
              strokeWidth={1.5}
              className="text-muted-foreground/50"
            />
            <p className="text-sm font-semibold text-slate-800">
              {search ? "No customers found" : "No customers yet"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {search
                ? "Try adjusting your search terms or filters."
                : "Add your first customer to get started."}
            </p>
            {!search && (
              <Button
                size="sm"
                className="mt-2 rounded-full px-4 text-xs h-8"
                onClick={onAddCustomer}
              >
                <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.5} />
                Add customer
              </Button>
            )}
          </div>
        ) : (
          customers.map((customer) => {
            const isSelected = selectedCustomerId === customer.id;
            const displayName =
              customer.company_name || customer.name || "Customer";

            return (
              <button
                key={customer.id}
                type="button"
                onClick={() => onSelectCustomer(customer.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer outline-none",
                  isSelected ? "bg-[#faf5eb]" : "bg-white hover:bg-black/1.5",
                )}
              >
                {/* Circle Avatar */}
                <CustomerAvatar name={displayName} />

                {/* Middle Info */}
                <div className="flex flex-1 flex-col min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {displayName}
                    </span>
                    {/* Status Badge */}
                    <CustomerStatusBadge />
                  </div>

                  <div className="text-xs text-muted-foreground truncate pt-0.5">
                    {customer.name}
                    {customer.contact_mobile
                      ? ` · ${customer.contact_mobile}`
                      : ""}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 truncate">
                    <HugeiconsIcon
                      icon={Location01Icon}
                      size={12}
                      strokeWidth={1.5}
                      className="shrink-0 text-muted-foreground/70"
                    />
                    <span className="truncate">
                      {[customer.location, customer.state]
                        .filter(Boolean)
                        .join(" · ") || "Location not set"}
                    </span>
                  </div>

                  {/* GSTIN Pill if present */}
                  {customer.gstin ? (
                    <div className="pt-1.5">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                        GSTIN: {customer.gstin}
                      </span>
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Left Split Footer: Fixed Pagination */}
      <div className="h-12 shrink-0 flex items-center justify-between border-t border-black/10 px-4 bg-[#fcfcfc] text-xs">
        <span className="text-muted-foreground font-mono">Total {total}</span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onNavigate({ page: page - 1 })}
              className="size-6.5 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 disabled:opacity-40 disabled:hover:bg-transparent"
              title="Previous page"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={13}
                strokeWidth={1.5}
              />
            </button>

            <span className="size-6.5 rounded-full bg-brand-green text-white font-medium flex items-center justify-center text-xs shadow-xs">
              {page}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onNavigate({ page: page + 1 })}
              className="size-6.5 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 disabled:opacity-40 disabled:hover:bg-transparent"
              title="Next page"
            >
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={13}
                strokeWidth={1.5}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
