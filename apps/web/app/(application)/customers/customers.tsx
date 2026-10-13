"use client";

import {
  Add01Icon,
  Building03Icon,
  Search01Icon,
  UserSearch01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CUSTOMER_TABLE_HEADERS,
  type CustomersProps,
} from "@/lib/data/customers";
import { AddCustomerForm } from "./add-customer-form";

export function Customers({
  customers,
  total: _total,
  page: _page,
  totalPages: _totalPages,
  search,
}: CustomersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function navigateToPage(newPage: number, newSearch?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    if (newSearch !== undefined) {
      if (newSearch) {
        params.set("search", newSearch);
      } else {
        params.delete("search");
      }
    }
    startTransition(() => {
      router.push(`/customers?${params.toString()}`);
    });
  }

  function onSearchChange(value: string) {
    navigateToPage(1, value);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
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
                  Manage tenant accounts and their organizations.
                </CardDescription>
              </div>
            </div>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger
                render={
                  <Button className="rounded-3xl shadow-lg shadow-brand-green/25">
                    <HugeiconsIcon
                      icon={Add01Icon}
                      size={16}
                      strokeWidth={1.5}
                    />
                    Add customer
                  </Button>
                }
              />
              <SheetContent
                side="right"
                className="w-full max-w-lg overflow-y-auto"
              >
                <SheetHeader>
                  <SheetTitle>Add customer</SheetTitle>
                  <SheetDescription>
                    Create a new tenant account.
                  </SheetDescription>
                </SheetHeader>
                <AddCustomerForm
                  onDone={() => {
                    setSheetOpen(false);
                    router.refresh();
                  }}
                  onError={setError}
                />
              </SheetContent>
            </Sheet>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {error && <FormMessage tone="error">{error}</FormMessage>}

            {/* Table */}
            <div className="overflow-hidden rounded-3xl border border-black/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-black/3 hover:bg-black/3">
                    {CUSTOMER_TABLE_HEADERS.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {customers.map((customer, index) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          {index + 1}
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
                              {customer.contact_mobile}" "
                              {customer.contact_telephone}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.address1 || customer.address2 ? (
                            <span className="text-xs text-muted-foreground">
                              {customer.address1}" "{customer.address2}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.opening_balance ? (
                            <span className="text-xs text-muted-foreground">
                              {customer.opening_balance}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
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
                      ? "No customers match your search."
                      : "No customers yet. Add your first one."}
                  </p>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <HugeiconsIcon
                icon={Search01Icon}
                size={18}
                strokeWidth={1.5}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                placeholder="Search by name or GSTIN…"
                defaultValue={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-11 rounded-3xl pl-10"
              />
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
