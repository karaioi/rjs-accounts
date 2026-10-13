/**
 * Static content for the customers domain.
 *
 * Keeps strings out of the page so copy and labels live in one place and can be
 * reused / reviewed independently of the component.
 */

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
