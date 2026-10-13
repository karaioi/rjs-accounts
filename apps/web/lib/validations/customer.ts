import * as z from "zod";

/**
 * Customer form schema (Zod v4 / Standard Schema).
 *
 * Two variants: GST-registered (includes GSTIN) and GST-unregistered (no GSTIN).
 */
const baseFields = {
  companyName: z.string().trim().min(1, "Company name is required."),
  location: z.string().trim().min(1, "Location is required."),
  address1: z.string().trim().min(1, "Address is required."),
  address2: z.string().trim().min(1, "Address is required."),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Pincode must be exactly 6 digits."),
  state: z.string().trim().min(1, "State is required."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(255, "Email must be 255 characters or fewer."),
  contactMobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  contactTelephone: z.string().trim().min(1, "Telephone is required."),
  openingBalanceType: z.enum(["credit", "debit"]),
  openingBalance: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount."),
  placeOfSupply: z.string().trim(),
  remarks: z.string().trim(),
};

export const gstRegisteredSchema = z.object({
  gstin: z
    .string()
    .trim()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Enter a valid GSTIN (e.g., 27AABCU9603R1ZX).",
    ),
  ...baseFields,
});

export const gstUnregisteredSchema = z.object({
  gstin: z.string().trim(),
  ...baseFields,
});

export type CustomerValues = typeof baseFields;
