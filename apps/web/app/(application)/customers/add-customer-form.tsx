"use client";

import {
  Add01Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  RefreshIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
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
import {
  createCustomer,
  lookupGstDetails,
  updateCustomer,
} from "@/lib/api/actions";
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
  const [isFetchingGst, setIsFetchingGst] = useState(false);
  const [gstFeedback, setGstFeedback] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);
  const [gstTab, setGstTab] = useState<GstTab>(
    defaultIsGst ? "registered" : "unregistered",
  );
  const [pendingGstTabChange, setPendingGstTabChange] = useState<GstTab | null>(
    null,
  );

  async function handleAutofillGst(gstinInput?: string) {
    const raw = gstinInput ?? form.getFieldValue("gstin");
    const clean = raw?.trim() ?? "";
    if (!clean) {
      setGstFeedback({ type: "error", message: "Please enter a GSTIN first." });
      return;
    }

    setIsFetchingGst(true);
    setGstFeedback(null);

    try {
      const res = await lookupGstDetails({ gstin: clean });
      if (!res.ok) {
        setGstFeedback({
          type: "error",
          message: res.message || "Failed to validate GSTIN.",
        });
        return;
      }

      const { data, warning } = res;
      // Auto-populate form fields
      if (data.companyName) {
        form.setFieldValue("companyName", data.companyName);
      }
      if (data.address1) {
        form.setFieldValue("address1", data.address1);
      }
      if (data.address2) {
        form.setFieldValue("address2", data.address2);
      }
      if (data.location) {
        form.setFieldValue("location", data.location);
      }
      if (data.pincode) {
        form.setFieldValue("pincode", data.pincode);
      }
      if (data.state) {
        form.setFieldValue("state", data.state);
      }
      if (data.placeOfSupply) {
        form.setFieldValue("placeOfSupply", data.placeOfSupply);
      }

      if (warning) {
        setGstFeedback({ type: "warning", message: warning });
      } else {
        const title = data.companyName || data.legalName || clean;
        setGstFeedback({
          type: "success",
          message: `Auto-filled details for "${title}" (${data.state || "Verified"}).`,
        });
      }
    } catch {
      setGstFeedback({
        type: "error",
        message: "An error occurred while fetching GST details.",
      });
    } finally {
      setIsFetchingGst(false);
    }
  }

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
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor={field.name}>
                        {CUSTOMER_FIELD_LABELS.gstin}
                      </FieldLabel>
                      <button
                        type="button"
                        onClick={() => handleAutofillGst(field.state.value)}
                        disabled={isFetchingGst || !field.state.value.trim()}
                        className="text-xs font-semibold text-brand-blue hover:text-brand-blue/80 flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors py-0.5"
                      >
                        <HugeiconsIcon
                          icon={isFetchingGst ? RefreshIcon : SparklesIcon}
                          size={13}
                          strokeWidth={2}
                          className={isFetchingGst ? "animate-spin" : ""}
                        />
                        <span>
                          {isFetchingGst ? "Fetching..." : "Auto-fill Details"}
                        </span>
                      </button>
                    </div>

                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value.toUpperCase());
                        if (gstFeedback) setGstFeedback(null);
                      }}
                      aria-invalid={isInvalid}
                      placeholder={CUSTOMER_PLACEHOLDERS.gstin}
                      className="h-11 rounded-3xl font-mono uppercase tracking-wider"
                    />

                    <Collapse show={isInvalid}>
                      <FieldError errors={field.state.meta.errors} />
                    </Collapse>

                    {/* GST Autofill feedback banner */}
                    <Collapse show={Boolean(gstFeedback)}>
                      {gstFeedback && (
                        <div
                          className={cn(
                            "mt-2 rounded-2xl p-3 text-xs flex items-start gap-2 border shadow-2xs",
                            gstFeedback.type === "success" &&
                              "bg-brand-green/10 text-brand-green border-brand-green/20",
                            gstFeedback.type === "warning" &&
                              "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
                            gstFeedback.type === "error" &&
                              "bg-rose-50 text-rose-700 border-rose-200",
                          )}
                        >
                          <HugeiconsIcon
                            icon={
                              gstFeedback.type === "success"
                                ? CheckmarkCircle02Icon
                                : Alert02Icon
                            }
                            size={15}
                            strokeWidth={2}
                            className="shrink-0 mt-0.5"
                          />
                          <div className="flex-1 leading-relaxed">
                            {gstFeedback.message}
                          </div>
                          <button
                            type="button"
                            onClick={() => setGstFeedback(null)}
                            className="text-[11px] underline shrink-0 hover:opacity-80 cursor-pointer ml-1"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
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
