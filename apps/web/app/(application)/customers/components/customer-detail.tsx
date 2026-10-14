"use client";

import {
  Building03Icon,
  CheckmarkCircle02Icon,
  Coins01Icon,
  Copy01Icon,
  Edit01Icon,
  TrashIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { SPRING_SOFT } from "@/components/motion/variants";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/api/types";
import { CUSTOMER_DATE_FORMATTER } from "@/lib/data/customers";
import { CustomerAvatar, CustomerStatusBadge } from "./customer-avatar";
import { CustomerActivityAccordion } from "./customer-activity-accordion";

interface CustomerDetailProps {
  customer: Customer | null;
  isAdmin?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomerDetail({
  customer,
  isAdmin = false,
  onEdit,
  onDelete,
}: CustomerDetailProps) {
  const [copiedGstin, setCopiedGstin] = useState(false);

  function copyGstinToClipboard(gstin: string) {
    navigator.clipboard.writeText(gstin);
    setCopiedGstin(true);
    setTimeout(() => setCopiedGstin(false), 2000);
  }

  if (!customer) {
    return (
      <div className="flex flex-1 min-w-0 h-full flex-col bg-white overflow-hidden min-h-0">
        <div className="h-16 shrink-0 border-b border-black/10 bg-white" />
        <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
          <div className="flex flex-col items-center gap-3">
            <HugeiconsIcon
              icon={Building03Icon}
              size={36}
              strokeWidth={1.5}
              className="text-muted-foreground/40"
            />
            <p className="text-base font-semibold text-slate-800">
              No customer selected
            </p>
            <p className="text-sm">
              Select a customer from the left list to review their details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = customer.company_name || customer.name;

  return (
    <div className="flex flex-1 min-w-0 h-full flex-col bg-white overflow-hidden min-h-0">
      <div className="flex flex-col h-full min-h-0">
        {/* Right Split Header: Fixed Top Header */}
        <div className="h-16 shrink-0 flex items-center justify-between border-b border-black/10 px-6 bg-white">
          <div className="flex items-center gap-3.5 min-w-0">
            <CustomerAvatar name={displayName} />
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-slate-900 truncate leading-snug">
                {displayName}
              </h2>
              <p className="text-xs text-muted-foreground truncate leading-tight">
                Primary Contact: {customer.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CustomerStatusBadge hasDot />
            {customer.gstin && (
              <span className="inline-flex items-center font-medium text-[10px] px-2.5 py-0.5 rounded-full border bg-brand-blue/10 text-brand-blue border-brand-blue/20 shadow-xs">
                GST Registered
              </span>
            )}
            {isAdmin && customer.organization_name && (
              <span className="inline-flex items-center font-medium text-[10px] px-2.5 py-0.5 rounded-full border bg-black/5 text-slate-700 border-black/10 shadow-xs">
                Org: {customer.organization_name}
              </span>
            )}
          </div>
        </div>

        {/* Right Split Body: SCROLLABLE Details Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={SPRING_SOFT}
              className="flex flex-col gap-5"
            >
              {/* Section 1: Profile Container */}
              <div className="rounded-2xl border border-black/10 bg-[#fafafa]/50 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 pb-1">
                  <HugeiconsIcon
                    icon={UserIcon}
                    size={16}
                    strokeWidth={1.5}
                    className="text-slate-600"
                  />
                  Profile & Identification
                </div>

                <div className="flex flex-col divide-y divide-black/5 text-sm">
                  {/* Country / Location */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      Country / Location
                    </span>
                    <span className="text-slate-900 font-medium">
                      {customer.location || "—"}
                    </span>
                  </div>

                  {/* City */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      City
                    </span>
                    <span className="text-slate-900 font-medium">
                      {customer.location || "—"}
                    </span>
                  </div>

                  {/* State / Region */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      State / Region
                    </span>
                    <span className="text-slate-900 font-medium">
                      {customer.state || "—"}{" "}
                      {customer.pincode ? `(PIN: ${customer.pincode})` : ""}
                    </span>
                  </div>

                  {/* Street Address */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      Address
                    </span>
                    <span className="text-slate-900 font-medium">
                      {[customer.address1, customer.address2]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </span>
                  </div>

                  {/* Email */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      Email
                    </span>
                    {customer.email ? (
                      <a
                        href={`mailto:${customer.email}`}
                        className="text-brand-blue hover:underline font-medium"
                      >
                        {customer.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Contact Person */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      Contact Person
                    </span>
                    <span className="text-slate-900 font-medium">
                      {customer.name}
                    </span>
                  </div>

                  {/* Mobile Phone */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      Mobile Phone
                    </span>
                    {customer.contact_mobile ? (
                      <a
                        href={`tel:${customer.contact_mobile}`}
                        className="font-mono text-slate-900 hover:text-brand-green font-medium"
                      >
                        {customer.contact_mobile}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Telephone */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      Telephone
                    </span>
                    {customer.contact_telephone ? (
                      <a
                        href={`tel:${customer.contact_telephone}`}
                        className="font-mono text-slate-900 hover:text-brand-green font-medium"
                      >
                        {customer.contact_telephone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* GSTIN */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      GSTIN
                    </span>
                    {customer.gstin ? (
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-black/5 px-2 py-0.5 font-mono text-xs font-semibold text-slate-900">
                          {customer.gstin}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            if (customer.gstin) {
                              copyGstinToClipboard(customer.gstin);
                            }
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-black/5 transition cursor-pointer"
                          title="Copy GSTIN"
                        >
                          <HugeiconsIcon
                            icon={
                              copiedGstin ? CheckmarkCircle02Icon : Copy01Icon
                            }
                            size={14}
                            strokeWidth={1.5}
                            className={copiedGstin ? "text-brand-green" : ""}
                          />
                        </button>
                        {copiedGstin && (
                          <span className="text-[11px] text-brand-green font-medium">
                            Copied!
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        Unregistered (No GSTIN)
                      </span>
                    )}
                  </div>

                  {/* Place of Supply */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      Place of Supply
                    </span>
                    <span className="text-slate-900 font-medium">
                      {customer.place_of_supply || "—"}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      Status
                    </span>
                    <CustomerStatusBadge hasDot />
                  </div>
                </div>
              </div>

              {/* Section 2: Ledger & Financial Details */}
              <div className="rounded-2xl border border-black/10 bg-[#fafafa]/50 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 pb-1">
                  <HugeiconsIcon
                    icon={Coins01Icon}
                    size={16}
                    strokeWidth={1.5}
                    className="text-slate-600"
                  />
                  Ledger & Financials
                </div>

                <div className="flex flex-col divide-y divide-black/5 text-sm">
                  {/* Opening Balance */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      Opening Balance
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-base">
                        ₹{" "}
                        {customer.opening_balance
                          ? Number(customer.opening_balance).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                              },
                            )
                          : "0.00"}
                      </span>
                      {customer.opening_balance_type && (
                        <span className="font-mono uppercase text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 text-slate-700">
                          {customer.opening_balance_type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Added On */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      Added On
                    </span>
                    <span className="text-slate-900 font-medium">
                      {CUSTOMER_DATE_FORMATTER.format(
                        new Date(customer.created_at),
                      )}
                    </span>
                  </div>

                  {/* Slug */}
                  <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      Unique Slug
                    </span>
                    <code className="text-xs font-mono text-slate-700">
                      {customer.slug ?? "—"}
                    </code>
                  </div>
                </div>
              </div>

              {/* Section 3: Customer Activity Accordion */}
              <CustomerActivityAccordion customer={customer} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Split Footer: Fixed Action Bar */}
        <div className="h-12 shrink-0 flex items-center justify-end gap-2.5 px-6 border-t border-black/10 bg-[#fcfcfc]">
          <Button
            type="button"
            variant="outline"
            className="rounded-full px-4 h-8 text-xs font-semibold gap-1.5 shadow-xs border-black/15 bg-white hover:bg-black/5"
            onClick={onEdit}
          >
            <HugeiconsIcon icon={Edit01Icon} size={13} strokeWidth={1.5} />
            Edit customer
          </Button>

          <Button
            type="button"
            className="rounded-full px-4 h-8 text-xs font-semibold gap-1.5 shadow-xs bg-rose-600 hover:bg-rose-700 text-white"
            onClick={onDelete}
          >
            <HugeiconsIcon icon={TrashIcon} size={13} strokeWidth={1.5} />
            Remove customer
          </Button>
        </div>
      </div>
    </div>
  );
}
