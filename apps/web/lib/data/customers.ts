import type { Customer } from "@/lib/api/types";

/**
 * Static content for the customers domain.
 *
 * Keeps strings out of the page so copy and labels live in one place and can be
 * reused / reviewed independently of the component.
 */

export type GstTab = "registered" | "unregistered";

export interface CustomersProps {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  isAdmin?: boolean;
  organizations?: { id: string; name: string; slug: string }[];
  selectedOrgId?: string;
}

export interface AddCustomerFormProps {
  onDone: () => void;
  onError: (message: string) => void;
  isAdmin?: boolean;
  organizations?: { id: string; name: string; slug: string }[];
  initialData?: Customer | null;
}

export interface CustomersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    organization_id?: string;
  }>;
}

export const CUSTOMER_DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Status badge tone behaviour, kept in sync with the badge registry. */
export const CUSTOMER_STATUS_TONE: Record<string, string> = {
  active: "bg-green-500/20 text-green-700 border-green-500/30",
  pending: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  archived: "bg-slate-500/20 text-slate-600 border-slate-500/30",
};

/** Deterministic palette for initials avatars across customer components. */
export const CUSTOMER_AVATAR_COLORS = [
  "bg-[#c2410c] text-white", // amber/orange
  "bg-[#1e3a8a] text-white", // navy/blue
  "bg-[#047857] text-white", // emerald/green
  "bg-[#7c3aed] text-white", // purple
  "bg-[#0284c7] text-white", // sky blue
  "bg-[#b45309] text-white", // bronze/amber
  "bg-[#be185d] text-white", // rose/pink
  "bg-[#334155] text-white", // slate
] as const;

export const CUSTOMER_FIELD_LABELS = {
  customerName: "Customer Name",
  slug: "Slug",
  gstin: "GSTIN",
  companyName: "Company Name",
  location: "Location",
  address1: "Address Line 1",
  address2: "Address Line 2",
  pincode: "Pincode",
  state: "State",
  email: "Email",
  contactMobile: "Contact (Mobile)",
  contactTelephone: "Contact (Telephone)",
  openingBalance: "Opening Balance",
  openingBalanceType: "Type",
  gstNo: "GST No",
  placeOfSupply: "Place of Supply",
} as const;

export const CUSTOMER_PLACEHOLDERS = {
  customerName: "Acme Corporation",
  slug: "acme-corp",
  gstin: "27AABCU9603R1ZX",
  companyName: "Acme Pvt. Ltd.",
  location: "Mumbai",
  address1: "123, Main Road",
  address2: "Andheri East",
  pincode: "400069",
  state: "Maharashtra",
  email: "contact@acme.com",
  contactMobile: "9876543210",
  contactTelephone: "022-12345678",
  openingBalance: "0.00",
  placeOfSupply: "",
} as const;

export const CUSTOMER_NO_GSTIN_HINT =
  "No GSTIN required. Fill in the remaining details below.";

/** Headers for the customers overview table. */
export const CUSTOMER_TABLE_HEADERS = [
  "S.No",
  "Company Name",
  "Name",
  "GST No",
  "Email",
  "Contact",
  "Place of Supply",
  "Opening Balance",
] as const;
