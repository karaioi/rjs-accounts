"use client";

import { FormMessage } from "@/components/auth-message";
import { Collapse } from "@/components/motion/collapse";
import { Reveal } from "@/components/motion/reveal";
import { SPRING_SOFT } from "@/components/motion/variants";
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
import { Textarea } from "@/components/ui/textarea";
import { createCustomer } from "@/lib/api/actions";
import type { Customer } from "@/lib/api/types";
import {
  CUSTOMER_FIELD_LABELS,
  CUSTOMER_NO_GSTIN_HINT,
  CUSTOMER_PLACEHOLDERS,
  CUSTOMER_TABLE_HEADERS
} from "@/lib/data/customers";
import {
  gstRegisteredSchema,
  gstUnregisteredSchema,
} from "@/lib/validations/customer";
import {
  Add01Icon,
  Building03Icon,
  RefreshIcon,
  Search01Icon,
  UserSearch01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

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

            {/* Table */}
            <div className="overflow-hidden rounded-3xl border border-black/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-black/[0.03] hover:bg-black/[0.03]">
                    {CUSTOMER_TABLE_HEADERS.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {customers.map((customer, index) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{customer.company_name ?? "—"}</TableCell>
                        <TableCell className="font-medium">{customer.name}</TableCell>
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
                          {customer.contact_mobile || customer.contact_telephone ? (
                            <span className="text-xs text-muted-foreground">
                              {customer.contact_mobile}
                              " "
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
                              {customer.address1}
                              " "
                              {customer.address2}
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

export default Customers;

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
      gstin: "",
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
      placeOfSupply: "",
      phone: "",
      openingBalanceType: "credit" as "credit" | "debit",
    },
    validators: {
      onSubmit:
        gstTab === "registered" ? gstRegisteredSchema : gstUnregisteredSchema,
    },
    onSubmit: async ({ value }) => {
      setPending(true);
      try {          const bodyWithGstin = gstTab === "registered"
            ? { ...value, gstin: value.gstin }
            : { ...value, gstin: undefined };

          const result = await createCustomer({
            name: bodyWithGstin.companyName,
            gstin: bodyWithGstin.gstin,
            companyName: bodyWithGstin.companyName,
            location: bodyWithGstin.location,
            address1: bodyWithGstin.address1,
            address2: bodyWithGstin.address2,
            pincode: bodyWithGstin.pincode,
            state: bodyWithGstin.state,
            email: bodyWithGstin.email,
            contactMobile: bodyWithGstin.contactMobile,
            contactTelephone: bodyWithGstin.contactTelephone,
            openingBalance: bodyWithGstin.openingBalance,
            openingBalanceType: bodyWithGstin.openingBalanceType,
            placeOfSupply: bodyWithGstin.placeOfSupply,
            phone: bodyWithGstin.phone,
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
                    <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.gstin}</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder={CUSTOMER_PLACEHOLDERS.gstin}
                      className="h-11 rounded-3xl font-mono"
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
            {CUSTOMER_NO_GSTIN_HINT}
          </p>
        </TabsContent>
      </Tabs>

      <FieldGroup className="gap-4">
        <form.Field name="companyName">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.companyName}</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder={CUSTOMER_PLACEHOLDERS.companyName}
                  className="h-11 rounded-3xl"
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
                <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.location}</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder={CUSTOMER_PLACEHOLDERS.location}
                  className="h-11 rounded-3xl"
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
                <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.address1}</FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder={CUSTOMER_PLACEHOLDERS.address1}
                  className="min-h-20 rounded-3xl resize-y"
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
                <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.address2}</FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder={CUSTOMER_PLACEHOLDERS.address2}
                  className="min-h-20 rounded-3xl resize-y"
                />
                <Collapse show={isInvalid}>
                  <FieldError errors={field.state.meta.errors} />
                </Collapse>
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="placeOfSupply">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.placeOfSupply}</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder={CUSTOMER_PLACEHOLDERS.placeOfSupply}
                  className="h-11 rounded-3xl"
                />
                <Collapse show={isInvalid}>
                  <FieldError errors={field.state.meta.errors} />
                </Collapse>
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="phone">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.phone}</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="tel"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder={CUSTOMER_PLACEHOLDERS.phone}
                  className="h-11 rounded-3xl"
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
                  <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.pincode}</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder={CUSTOMER_PLACEHOLDERS.pincode}
                    className="h-11 rounded-3xl"
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
                  <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.state}</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder={CUSTOMER_PLACEHOLDERS.state}
                    className="h-11 rounded-3xl"
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
                <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.email}</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder={CUSTOMER_PLACEHOLDERS.email}
                  className="h-11 rounded-3xl"
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
                  <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.contactMobile}</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="tel"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder={CUSTOMER_PLACEHOLDERS.contactMobile}
                    className="h-11 rounded-3xl"
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
                    {CUSTOMER_FIELD_LABELS.contactTelephone}
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="tel"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder={CUSTOMER_PLACEHOLDERS.contactTelephone}
                    className="h-11 rounded-3xl"
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
                  <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.openingBalance}</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="text"
                    inputMode="decimal"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder={CUSTOMER_PLACEHOLDERS.openingBalance}
                    className="h-11 rounded-3xl"
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
                  <FieldLabel htmlFor={field.name}>{CUSTOMER_FIELD_LABELS.openingBalanceType}</FieldLabel>
                  <Select
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.value as "credit" | "debit")
                    }
                    className="h-11 rounded-3xl"
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
          variant="outline"
          className="rounded-3xl"
          onClick={() => form.reset()}
          disabled={pending}
        >
          <HugeiconsIcon icon={RefreshIcon} size={16} strokeWidth={1.5} />
          {pending ? "Resetting…" : "Reset"}
        </Button>
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={SPRING_SOFT}
        >
          <Button
            type="submit"
            form="add-customer-form"
            className="rounded-3xl shadow-lg shadow-brand-green/25"
            disabled={pending}
          >
            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.5} />
            {pending ? "Creating…" : "Create customer"}
          </Button>
        </motion.div>
      </SheetFooter>
    </form>
  );
}

