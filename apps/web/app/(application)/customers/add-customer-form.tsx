"use client";

import { Add01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { motion } from "motion/react";
import { useState } from "react";
import { FormMessage } from "@/components/auth-message";
import { Collapse } from "@/components/motion/collapse";
import { SPRING_SOFT } from "@/components/motion/variants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "cn";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createCustomer, updateCustomer } from "@/lib/api/actions";
import {
  type AddCustomerFormProps,
  CUSTOMER_FIELD_LABELS,
  CUSTOMER_NO_GSTIN_HINT,
  CUSTOMER_PLACEHOLDERS,
  type GstTab,
} from "@/lib/data/customers";
import { customerSchema } from "@/lib/validations/customer";

export function AddCustomerForm({
  onDone,
  onError,
  isAdmin,
  organizations,
  initialData,
}: AddCustomerFormProps) {
  const isEdit = Boolean(initialData);
  const defaultIsGst = Boolean(initialData?.gstin);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [gstTab, setGstTab] = useState<GstTab>(
    defaultIsGst ? "registered" : "unregistered",
  );
  const [pendingGstTabChange, setPendingGstTabChange] = useState<GstTab | null>(
    null,
  );

  function applyTabChange(targetTab: GstTab) {
    setGstTab(targetTab);
    form.setFieldValue("isGstRegistered", targetTab === "registered");
    if (targetTab === "unregistered") {
      form.setFieldValue("gstin", "");
    }
  }

  function handleTabChangeRequest(value: string) {
    const targetTab = value as GstTab;
    if (targetTab === gstTab) return;

    if (isEdit) {
      // In edit customer mode: prompt confirmation before changing tab
      setPendingGstTabChange(targetTab);
    } else {
      // In create customer mode: change directly
      applyTabChange(targetTab);
    }
  }

  function handleConfirmTabChange() {
    if (pendingGstTabChange) {
      applyTabChange(pendingGstTabChange);
      setPendingGstTabChange(null);
    }
  }

  function handleCancelTabChange() {
    setPendingGstTabChange(null);
  }

  const form = useForm({
    defaultValues: {
      isGstRegistered: defaultIsGst,
      organizationId:
        initialData?.organization_id ?? organizations?.[0]?.id ?? "",
      gstin: initialData?.gstin ?? "",
      companyName: initialData?.company_name ?? initialData?.name ?? "",
      location: initialData?.location ?? "",
      address1: initialData?.address1 ?? "",
      address2: initialData?.address2 ?? "",
      pincode: initialData?.pincode ?? "",
      state: initialData?.state ?? "",
      email: initialData?.email ?? "",
      contactMobile: initialData?.contact_mobile ?? "",
      contactTelephone: initialData?.contact_telephone ?? "",
      openingBalance: initialData?.opening_balance ?? "",
      placeOfSupply: initialData?.place_of_supply ?? "",
      openingBalanceType:
        (initialData?.opening_balance_type as "credit" | "debit") ?? "credit",
    },
    validators: {
      onSubmit: customerSchema,
    },
    onSubmit: async ({ value }) => {
      setPending(true);
      setFormError(null);
      try {
        const isRegistered = gstTab === "registered" && value.isGstRegistered;
        const gstinValue =
          isRegistered && value.gstin.trim() ? value.gstin.trim() : "";

        const payload = {
          name: value.companyName.trim(),
          gstin: gstinValue,
          companyName: value.companyName.trim(),
          location: value.location || undefined,
          address1: value.address1 || undefined,
          address2: value.address2 || undefined,
          pincode: value.pincode || undefined,
          state: value.state || undefined,
          email: value.email || undefined,
          contactMobile: value.contactMobile || undefined,
          contactTelephone: value.contactTelephone || undefined,
          openingBalance: value.openingBalance || undefined,
          openingBalanceType: value.openingBalanceType,
          placeOfSupply: value.placeOfSupply || undefined,
          organizationId: value.organizationId || undefined,
        };

        const result = initialData
          ? await updateCustomer({
              customerId: initialData.id,
              ...payload,
            })
          : await createCustomer({
              ...payload,
              gstin: gstinValue || undefined,
            });

        if (!result.ok) {
          setFormError(result.message);
          onError(result.message);
          return;
        }

        onDone();
      } catch {
        const msg = initialData
          ? "Could not update that customer. Please try again."
          : "Could not create that customer. Please try again.";
        setFormError(msg);
        onError(msg);
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
        setFormError(null);
        form.handleSubmit();
      }}
      className="flex flex-col gap-5"
    >
      {formError && <FormMessage tone="error">{formError}</FormMessage>}

      {isAdmin && organizations && organizations.length > 0 && (
        <form.Field name="organizationId">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Organization</FieldLabel>
              <Select
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-11 rounded-3xl"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.slug})
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </form.Field>
      )}

      <Tabs value={gstTab} onValueChange={handleTabChangeRequest}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="registered">GST Registered</TabsTrigger>
          <TabsTrigger value="unregistered">GST Unregistered</TabsTrigger>
        </TabsList>

        <TabsContent value="registered" className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <form.Field name="gstin">
              {(field) => {
                const isInvalid =
                  !field.state.meta.isValid &&
                  (field.state.meta.isTouched ||
                    field.state.meta.errors.length > 0);
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      {CUSTOMER_FIELD_LABELS.gstin}
                    </FieldLabel>
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
              !field.state.meta.isValid &&
              (field.state.meta.isTouched ||
                field.state.meta.errors.length > 0);
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  {CUSTOMER_FIELD_LABELS.companyName}
                </FieldLabel>
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
              !field.state.meta.isValid &&
              (field.state.meta.isTouched ||
                field.state.meta.errors.length > 0);
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  {CUSTOMER_FIELD_LABELS.location}
                </FieldLabel>
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
              !field.state.meta.isValid &&
              (field.state.meta.isTouched ||
                field.state.meta.errors.length > 0);
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  {CUSTOMER_FIELD_LABELS.address1}
                </FieldLabel>
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
              !field.state.meta.isValid &&
              (field.state.meta.isTouched ||
                field.state.meta.errors.length > 0);
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  {CUSTOMER_FIELD_LABELS.address2}
                </FieldLabel>
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
              !field.state.meta.isValid &&
              (field.state.meta.isTouched ||
                field.state.meta.errors.length > 0);
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  {CUSTOMER_FIELD_LABELS.placeOfSupply}
                </FieldLabel>
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

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="pincode">
            {(field) => {
              const isInvalid =
                !field.state.meta.isValid &&
                (field.state.meta.isTouched ||
                  field.state.meta.errors.length > 0);
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    {CUSTOMER_FIELD_LABELS.pincode}
                  </FieldLabel>
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
                !field.state.meta.isValid &&
                (field.state.meta.isTouched ||
                  field.state.meta.errors.length > 0);
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    {CUSTOMER_FIELD_LABELS.state}
                  </FieldLabel>
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
              !field.state.meta.isValid &&
              (field.state.meta.isTouched ||
                field.state.meta.errors.length > 0);
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  {CUSTOMER_FIELD_LABELS.email}
                </FieldLabel>
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
                !field.state.meta.isValid &&
                (field.state.meta.isTouched ||
                  field.state.meta.errors.length > 0);
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    {CUSTOMER_FIELD_LABELS.contactMobile}
                  </FieldLabel>
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
                !field.state.meta.isValid &&
                (field.state.meta.isTouched ||
                  field.state.meta.errors.length > 0);
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

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="openingBalanceType">
            {(field) => {
              return (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    {CUSTOMER_FIELD_LABELS.openingBalanceType}
                  </FieldLabel>
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

          <form.Field name="openingBalance">
            {(field) => {
              const isInvalid =
                !field.state.meta.isValid &&
                (field.state.meta.isTouched ||
                  field.state.meta.errors.length > 0);
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    {CUSTOMER_FIELD_LABELS.openingBalance}
                  </FieldLabel>
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
        </div>
      </FieldGroup>

      <SheetFooter className="mt-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-3xl"
          onClick={() => {
            setFormError(null);
            form.reset();
          }}
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
            {pending
              ? initialData
                ? "Saving…"
                : "Creating…"
              : initialData
                ? "Save changes"
                : "Create customer"}
          </Button>
        </motion.div>
      </SheetFooter>

      {/* Confirmation Dialog when switching GST Registered <-> Unregistered in Edit mode */}
      <Dialog
        open={Boolean(pendingGstTabChange)}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelTabChange();
          }
        }}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {pendingGstTabChange === "unregistered"
                ? "Change to GST Unregistered?"
                : "Change to GST Registered?"}
            </DialogTitle>
            <DialogDescription>
              {pendingGstTabChange === "unregistered"
                ? `Changing this customer to Unregistered will permanently clear their GSTIN (${initialData?.gstin || "recorded GSTIN"}) upon saving. Are you sure you want to proceed?`
                : "Changing this customer to GST Registered will require providing a valid 15-character GSTIN before saving. Are you sure you want to proceed?"}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-3xl"
              onClick={handleCancelTabChange}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(
                "rounded-3xl shadow-sm text-white",
                pendingGstTabChange === "unregistered"
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  : "bg-brand-green hover:bg-brand-green/90 shadow-brand-green/20",
              )}
              onClick={handleConfirmTabChange}
            >
              {pendingGstTabChange === "unregistered"
                ? "Yes, change to Unregistered"
                : "Yes, change to Registered"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
