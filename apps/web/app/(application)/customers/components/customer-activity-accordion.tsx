"use client";

import {
  Activity01Icon,
  Add01Icon,
  ArrowDown01Icon,
  Edit01Icon,
  RefreshIcon,
  TrashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState, useTransition } from "react";
import { Collapse } from "@/components/motion/collapse";
import { getCustomerActivity } from "@/lib/api/actions";
import type {
  Customer,
  CustomerActivity,
  CustomerSnapshot,
} from "@/lib/api/types";

interface CustomerActivityAccordionProps {
  customer: Customer;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Contact Name",
  company_name: "Company Name",
  gstin: "GSTIN",
  location: "Location",
  address1: "Address Line 1",
  address2: "Address Line 2",
  pincode: "PIN Code",
  state: "State",
  email: "Email",
  contact_mobile: "Mobile Number",
  contact_telephone: "Telephone",
  opening_balance: "Opening Balance",
  opening_balance_type: "Balance Type",
  place_of_supply: "Place of Supply",
};

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

function formatValue(key: string, val: unknown): string {
  if (val === null || val === undefined || val === "") {
    return "None";
  }
  if (key === "opening_balance") {
    const num = Number(val);
    if (!Number.isNaN(num)) {
      return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    }
  }
  if (key === "opening_balance_type") {
    return String(val).toUpperCase();
  }
  return String(val);
}

export function CustomerActivityAccordion({
  customer,
}: CustomerActivityAccordionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = () => {
    startTransition(async () => {
      setError(null);
      const res = await getCustomerActivity({ customerId: customer.id });
      if (!res.ok) {
        setError(res.message || "Failed to load activity logs");
        return;
      }

      let items = res.items || [];
      // If no audit records exist yet (e.g. for legacy records created before logging),
      // synthesize the creation event from the customer record itself.
      if (items.length === 0) {
        items = [
          {
            id: 0,
            action: "customer.create",
            entity_type: "customer",
            entity_id: customer.id,
            actor_user_id: null,
            actor_name: "Initial Creation",
            before: null,
            after: {
              name: customer.name,
              company_name: customer.company_name,
              gstin: customer.gstin,
              location: customer.location,
              opening_balance: customer.opening_balance,
              opening_balance_type: customer.opening_balance_type,
            },
            created_at: customer.created_at,
          },
        ];
      }
      setActivities(items);
    });
  };

  useEffect(() => {
    fetchActivities();
  }, [customer.id]);

  return (
    <div className="rounded-2xl border border-black/10 bg-[#fafafa]/50 overflow-hidden transition-all">
      {/* Accordion Trigger Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-5 text-left select-none cursor-pointer hover:bg-black/[0.02] transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <HugeiconsIcon
            icon={Activity01Icon}
            size={16}
            strokeWidth={1.5}
            className="text-slate-600"
          />
          <span>Activity & History</span>
          <span className="inline-flex items-center font-medium text-[10px] px-2 py-0.5 rounded-full bg-black/5 text-slate-700 border border-black/10">
            {activities.length} {activities.length === 1 ? "event" : "events"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <HugeiconsIcon
                icon={RefreshIcon}
                size={12}
                strokeWidth={1.5}
                className="animate-spin text-slate-500"
              />
              Loading...
            </span>
          )}
          <div
            className={`text-slate-500 transition-transform duration-200 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            <HugeiconsIcon icon={ArrowDown01Icon} size={15} strokeWidth={1.5} />
          </div>
        </div>
      </button>

      {/* Accordion Content */}
      <Collapse show={isOpen} className="px-5 pb-5">
        <div className="pt-2 border-t border-black/5 flex flex-col gap-3">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-black/5 text-slate-700 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchActivities}
                className="font-semibold text-brand-blue hover:underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {activities.length === 0 && !isPending && !error && (
            <p className="text-xs text-muted-foreground py-2 text-center">
              No recorded activity for this customer yet.
            </p>
          )}

          <div className="relative pl-6 border-l border-black/10 ml-2 space-y-4 py-1">
            {activities.map((item) => {
              const isCreate = item.action.includes("create");
              const isDelete = item.action.includes("delete");
              const isUpdate =
                item.action.includes("update") || (!isCreate && !isDelete);

              // Calculate changed fields for updates
              const diffEntries: { key: string; from: string; to: string }[] =
                [];
              if (isUpdate && item.before && item.after) {
                const checkedKeys = new Set([
                  ...Object.keys(item.before),
                  ...Object.keys(item.after),
                ]);
                for (const key of checkedKeys) {
                  if (key === "organization_id") continue;
                  const typedKey = key as keyof CustomerSnapshot;
                  const beforeVal = item.before[typedKey];
                  const afterVal = item.after[typedKey];
                  if (beforeVal !== afterVal) {
                    diffEntries.push({
                      key,
                      from: formatValue(key, beforeVal),
                      to: formatValue(key, afterVal),
                    });
                  }
                }
              }

              return (
                <div
                  key={item.id || item.created_at}
                  className="relative group"
                >
                  {/* Timeline Node Icon */}
                  <div className="absolute -left-[31px] top-0.5 size-5 rounded-full flex items-center justify-center bg-white border border-black/15 shadow-xs">
                    {isCreate && (
                      <HugeiconsIcon
                        icon={Add01Icon}
                        size={11}
                        strokeWidth={2}
                        className="text-brand-green"
                      />
                    )}
                    {isUpdate && (
                      <HugeiconsIcon
                        icon={Edit01Icon}
                        size={11}
                        strokeWidth={2}
                        className="text-brand-blue"
                      />
                    )}
                    {isDelete && (
                      <HugeiconsIcon
                        icon={TrashIcon}
                        size={11}
                        strokeWidth={2}
                        className="text-slate-700"
                      />
                    )}
                  </div>

                  {/* Activity Details Card */}
                  <div className="rounded-xl border border-black/5 bg-white p-3 shadow-2xs flex flex-col gap-2">
                    {/* Header Row: Badge, Actor, Time */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        {isCreate && (
                          <span className="inline-flex items-center font-bold text-[10px] px-2 py-0.5 rounded-full border bg-brand-green/10 text-brand-green border-brand-green/20">
                            Created
                          </span>
                        )}
                        {isUpdate && (
                          <span className="inline-flex items-center font-bold text-[10px] px-2 py-0.5 rounded-full border bg-brand-blue/10 text-brand-blue border-brand-blue/20">
                            Updated
                          </span>
                        )}
                        {isDelete && (
                          <span className="inline-flex items-center font-bold text-[10px] px-2 py-0.5 rounded-full border bg-black/5 text-slate-700 border-black/10">
                            Deleted
                          </span>
                        )}

                        <span className="text-xs font-semibold text-slate-800">
                          {item.actor_name
                            ? `by ${item.actor_name}`
                            : "by Workspace User"}
                        </span>
                      </div>

                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatTimestamp(item.created_at)}
                      </span>
                    </div>

                    {/* Diff / Payload Breakdown */}
                    {isUpdate && diffEntries.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-black/5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Modified Fields:
                        </span>
                        <div className="flex flex-col gap-1 text-xs">
                          {diffEntries.map((diff) => (
                            <div
                              key={diff.key}
                              className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 bg-black/[0.02] px-2.5 py-1.5 rounded-lg border border-black/5"
                            >
                              <span className="text-slate-600 font-medium text-[11px] min-w-28 shrink-0">
                                {FIELD_LABELS[diff.key] || diff.key}:
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="line-through text-muted-foreground font-mono text-[11px]">
                                  {diff.from}
                                </span>
                                <span className="text-brand-blue text-[11px]">
                                  →
                                </span>
                                <span className="font-semibold text-slate-900 font-mono text-[11px]">
                                  {diff.to}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isUpdate && diffEntries.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        Customer details were updated.
                      </p>
                    )}

                    {isCreate && item.after && (
                      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-black/5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Initial Record:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {Boolean(item.after.company_name) && (
                            <div className="bg-black/[0.02] px-2.5 py-1 rounded-lg border border-black/5 flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">
                                Company
                              </span>
                              <span className="font-medium text-slate-900 text-[11px] truncate max-w-36">
                                {String(item.after.company_name)}
                              </span>
                            </div>
                          )}
                          {Boolean(item.after.name) && (
                            <div className="bg-black/[0.02] px-2.5 py-1 rounded-lg border border-black/5 flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">
                                Contact
                              </span>
                              <span className="font-medium text-slate-900 text-[11px] truncate max-w-36">
                                {String(item.after.name)}
                              </span>
                            </div>
                          )}
                          <div className="bg-black/[0.02] px-2.5 py-1 rounded-lg border border-black/5 flex items-center justify-between">
                            <span className="text-slate-500 text-[11px]">
                              GSTIN
                            </span>
                            <span className="font-medium text-slate-900 text-[11px] font-mono">
                              {item.after.gstin
                                ? String(item.after.gstin)
                                : "Unregistered"}
                            </span>
                          </div>
                          {Boolean(item.after.location) && (
                            <div className="bg-black/[0.02] px-2.5 py-1 rounded-lg border border-black/5 flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">
                                Location
                              </span>
                              <span className="font-medium text-slate-900 text-[11px]">
                                {String(item.after.location)}
                              </span>
                            </div>
                          )}
                          {Boolean(item.after.opening_balance) && (
                            <div className="bg-black/[0.02] px-2.5 py-1 rounded-lg border border-black/5 flex items-center justify-between col-span-full">
                              <span className="text-slate-500 text-[11px]">
                                Opening Balance
                              </span>
                              <span className="font-medium text-slate-900 text-[11px] font-mono">
                                ₹{" "}
                                {Number(
                                  item.after.opening_balance,
                                ).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                                {item.after.opening_balance_type
                                  ? ` (${String(item.after.opening_balance_type).toUpperCase()})`
                                  : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isDelete && (
                      <p className="text-xs text-muted-foreground italic">
                        Customer was removed from the active directory.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Collapse>
    </div>
  );
}
