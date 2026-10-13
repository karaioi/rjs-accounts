/** Static content for the customers domain. */

export const CUSTOMERS_PAGE_SIZE = 10;

export const CUSTOMER_STATUS_TONE: Record<string, string> = {
  active: "border-brand-green/25 bg-brand-green/10 text-brand-green",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  suspended: "border-destructive/25 bg-destructive/10 text-destructive",
  archived: "border-black/10 bg-black/5 text-muted-foreground",
};

export const CUSTOMER_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
});
