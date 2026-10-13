"use client";

import {
  Add01Icon,
  Building03Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Search01Icon,
  UserSearch01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { FormMessage } from "@/components/auth-message";
import { Collapse } from "@/components/motion/collapse";
import { Reveal } from "@/components/motion/reveal";
import { SPRING_SOFT } from "@/components/motion/variants";
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createCustomer } from "@/lib/api/actions";
import type { Customer } from "@/lib/api/types";
import {
  CUSTOMER_DATE_FORMATTER,
  CUSTOMER_STATUS_TONE,
} from "@/lib/data/customers";
import {
  gstRegisteredSchema,
  gstUnregisteredSchema,
} from "@/lib/validations/customer";

type GstTab = "registered" | "unregistered";

interface CustomersProps {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
}

export function Customers({
  customers,
  total,
  page,
  totalPages,
  search,
}: CustomersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-blue/10 text-brand-blue">
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
                  <Button className="rounded-xl shadow-lg shadow-brand-green/25">
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
                    Create a new tenant account. Fill in the details based on
                    their GST registration status.
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
                placeholder="Search by name, slug, or GSTIN…"
                defaultValue={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-11 rounded-xl pl-10"
              />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-black/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-black/[0.03] hover:bg-black/[0.03]">
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          {customer.name}
                        </TableCell>
                        <TableCell>
                          <code className="rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                            {customer.slug}
                          </code>
                        </TableCell>
                        <TableCell>
                          {customer.gstin ? (
                            <code className="rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                              {customer.gstin}
                            </code>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              CUSTOMER_STATUS_TONE[customer.status] ??
                              CUSTOMER_STATUS_TONE.archived
                            }
                          >
                            {customer.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {CUSTOMER_DATE_FORMATTER.format(
                            new Date(customer.created_at),
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} · {total} total
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={page <= 1 || isPending}
                    onClick={() => navigateToPage(page - 1)}
                    aria-label="Previous page"
                  >
                    <HugeiconsIcon
                      icon={ChevronLeftIcon}
                      size={16}
                      strokeWidth={1.5}
                    />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNum) => (
                      <Button
                        key={pageNum}
                        type="button"
                        variant={pageNum === page ? "default" : "ghost"}
                        size="sm"
                        className="rounded-lg"
                        disabled={isPending}
                        onClick={() => navigateToPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    ),
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={page >= totalPages || isPending}
                    onClick={() => navigateToPage(page + 1)}
                    aria-label="Next page"
                  >
                    <HugeiconsIcon
                      icon={ChevronRightIcon}
                      size={16}
                      strokeWidth={1.5}
                    />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}

function AddCustomerForm({
  onDone,
  onError,
}: {
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [gstTab, setGstTab] = useState<GstTab>("registered");

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      gstin: "",
      customerName: "",
      companyName: "",
      location: "",
      address1: "",
      address2: "",
      pincode: "",
      state: "",
      email: "",
      contactMobile: "",
      contactTelephone: "",
      openingBalance: "",
      openingBalanceType: "credit" as "credit" | "debit",
    },
    validators: {
      onSubmit:
        gstTab === "registered" ? gstRegisteredSchema : gstUnregisteredSchema,
    },
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        const result = await createCustomer({
          name: value.customerName || value.name,
          slug: value.slug,
          gstin: gstTab === "registered" ? value.gstin : undefined,
          companyName: value.companyName,
          location: value.location,
          address1: value.address1,
          address2: value.address2,
          pincode: value.pincode,
          state: value.state,
          email: value.email,
          contactMobile: value.contactMobile,
          contactTelephone: value.contactTelephone,
          openingBalance: value.openingBalance,
          openingBalanceType: value.openingBalanceType,
        });

        if (!result.ok) {
          onError(result.message);
          return;
        }

        onDone();
      } catch {
        onError("Could not create that customer. Please try again.");
      } finally {
        setPending(false);
      }
    },
  });

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  return (
    <form
      id="add-customer-form"
      method="post"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
      className="flex flex-col gap-5"
    >
      <Tabs
        value={gstTab}
        onValueChange={(value) => setGstTab(value as GstTab)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="registered">GST Registered</TabsTrigger>
          <TabsTrigger value="unregistered">GST Unregistered</TabsTrigger>
        </TabsList>

        <TabsContent value="registered" className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <form.Field name="gstin">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>GSTIN</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="27AABCU9603R1ZX"
                      className="h-11 rounded-xl font-mono"
                    />
                    <Collapse show={isInvalid}>
                      <FieldError errors={field.state.meta.errors} />
                    </Collapse>
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
        </TabsContent>

        <TabsContent value="unregistered" className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            No GSTIN required. Fill in the remaining details below.
          </p>
        </TabsContent>
      </Tabs>

      <FieldGroup className="gap-4">
        <form.Field name="customerName">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Customer Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    const slugField = form.getFieldMeta("slug");
                    if (slugField && !slugField.isTouched) {
                      form.setFieldValue("slug", generateSlug(e.target.value));
                    }
                  }}
                  aria-invalid={isInvalid}
                  placeholder="Acme Corporation"
                  className="h-11 rounded-xl"
                />
                <Collapse show={isInvalid}>
                  <FieldError errors={field.state.meta.errors} />
                </Collapse>
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="slug">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="acme-corp"
                  className="h-11 rounded-xl font-mono"
                />
                <Collapse show={isInvalid}>
                  <FieldError errors={field.state.meta.errors} />
                </Collapse>
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="companyName">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Company Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Acme Pvt. Ltd."
                  className="h-11 rounded-xl"
                />
                <Collapse show={isInvalid}>
                  <FieldError errors={field.state.meta.errors} />
                </Collapse>
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="location">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Location</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Mumbai"
                  className="h-11 rounded-xl"
                />
                <Collapse show={isInvalid}>
                  <FieldError errors={field.state.meta.errors} />
                </Collapse>
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="address1">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Address Line 1</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="123, Main Road"
                  className="h-11 rounded-xl"
                />
                <Collapse show={isInvalid}>
                  <FieldError errors={field.state.meta.errors} />
                </Collapse>
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="address2">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Address Line 2</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Andheri East"
                  className="h-11 rounded-xl"
                />
                <Collapse show={isInvalid}>
                  <FieldError errors={field.state.meta.errors} />
                </Collapse>
              </Field>
            );
          }}
        </form.Field>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="pincode">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Pincode</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="400069"
                    className="h-11 rounded-xl"
                  />
                  <Collapse show={isInvalid}>
                    <FieldError errors={field.state.meta.errors} />
                  </Collapse>
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="state">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>State</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Maharashtra"
                    className="h-11 rounded-xl"
                  />
                  <Collapse show={isInvalid}>
                    <FieldError errors={field.state.meta.errors} />
                  </Collapse>
                </Field>
              );
            }}
          </form.Field>
        </div>

        <form.Field name="email">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="contact@acme.com"
                  className="h-11 rounded-xl"
                />
                <Collapse show={isInvalid}>
                  <FieldError errors={field.state.meta.errors} />
                </Collapse>
              </Field>
            );
          }}
        </form.Field>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="contactMobile">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Contact (Mobile)</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="tel"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="9876543210"
                    className="h-11 rounded-xl"
                  />
                  <Collapse show={isInvalid}>
                    <FieldError errors={field.state.meta.errors} />
                  </Collapse>
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="contactTelephone">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Contact (Telephone)
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="tel"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="022-12345678"
                    className="h-11 rounded-xl"
                  />
                  <Collapse show={isInvalid}>
                    <FieldError errors={field.state.meta.errors} />
                  </Collapse>
                </Field>
              );
            }}
          </form.Field>
        </div>

        <div className="grid grid-cols-[1fr_120px] gap-4">
          <form.Field name="openingBalance">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Opening Balance</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="text"
                    inputMode="decimal"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="0.00"
                    className="h-11 rounded-xl"
                  />
                  <Collapse show={isInvalid}>
                    <FieldError errors={field.state.meta.errors} />
                  </Collapse>
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="openingBalanceType">
            {(field) => {
              return (
                <Field>
                  <FieldLabel htmlFor={field.name}>Type</FieldLabel>
                  <Select
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.value as "credit" | "debit")
                    }
                    className="h-11 rounded-xl"
                  >
                    <option value="credit">Credit</option>
                    <option value="debit">Debit</option>
                  </Select>
                </Field>
              );
            }}
          </form.Field>
        </div>
      </FieldGroup>

      <SheetFooter className="mt-2">
        <Button
          type="button"
          variant="ghost"
          className="rounded-xl"
          onClick={() => form.reset()}
          disabled={pending}
        >
          Reset
        </Button>
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={SPRING_SOFT}
        >
          <Button
            type="submit"
            form="add-customer-form"
            className="rounded-xl shadow-lg shadow-brand-green/25"
            disabled={pending}
          >
            {pending ? "Creating…" : "Create customer"}
          </Button>
        </motion.div>
      </SheetFooter>
    </form>
  );
}
