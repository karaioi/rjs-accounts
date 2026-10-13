import type { OrganizationItem, PendingUser } from "@/lib/api/types";

export const ADMIN_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export const ORGANIZATION_STATUS_FILTERS = [
  "all",
  "active",
  "pending",
  "suspended",
  "archived",
] as const;

export type OrganizationStatusFilter =
  (typeof ORGANIZATION_STATUS_FILTERS)[number];

export interface AdminUsersProps {
  users: PendingUser[] | null;
}

export interface PendingUserAction {
  user: PendingUser;
  type: "approve" | "reject" | "delete";
}

export interface AdminOrganizationsProps {
  organizations: OrganizationItem[] | null;
}
