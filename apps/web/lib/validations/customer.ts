import * as z from "zod";
import { validateGstin } from "@/lib/utils/gstin";

/**
 * Customer form schema (Zod v4 / Standard Schema).
 *
 * Uses a single static schema with superRefine so Standard Schema in TanStack Form
 * validates correctly even when switching between GST registered and unregistered.
 */
export const customerSchema = z
  .object({
    isGstRegistered: z.boolean(),
    organizationId: z.string(),
    companyName: z.string().trim().min(1, "Company name is required."),
    gstin: z.string(),
    location: z.string(),
    address1: z.string(),
    address2: z.string(),
    pincode: z.string().refine((val) => !val || /^\d{6}$/.test(val.trim()), {
      message: "Pincode must be exactly 6 digits.",
    }),
    state: z.string(),
    email: z
      .string()
      .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()), {
        message: "Enter a valid email address.",
      }),
    contactMobile: z
      .string()
      .refine((val) => !val || /^[0-9]{10}$/.test(val.trim()), {
        message: "Enter a valid 10-digit mobile number.",
      }),
    contactTelephone: z.string(),
    openingBalanceType: z.enum(["credit", "debit"]),
    openingBalance: z
      .string()
      .refine((val) => !val || /^\d+(\.\d{1,2})?$/.test(val.trim()), {
        message: "Enter a valid amount.",
      }),
    placeOfSupply: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.isGstRegistered) {
      const trimmed = data.gstin.trim();
      if (!trimmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "GSTIN is required.",
          path: ["gstin"],
        });
      } else {
        const result = validateGstin(trimmed);
        if (!result.isValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: result.error || "Enter a valid GSTIN.",
            path: ["gstin"],
          });
        }
      }
    }
  });

export type CustomerValues = z.infer<typeof customerSchema>;
