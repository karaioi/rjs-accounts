/** Response shapes the web app consumes from the FastAPI backend. */

/** `GET /api/v1/customers` */
export interface Customer {
  id: string;
  name: string;
  status: string;
  organization_id: string | null;
  organization_name: string | null;
  gstin: string | null;
  company_name: string | null;
  location: string | null;
  address1: string | null;
  address2: string | null;
  pincode: string | null;
  state: string | null;
  email: string | null;
  contact_mobile: string | null;
  contact_telephone: string | null;
  opening_balance: string | null;
  opening_balance_type: "credit" | "debit" | null;
  place_of_supply: string | null;
  created_at: string;
  approved_at: string | null;
}

/** `GET /api/v1/customers` — paginated response */
export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Membership {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  customer_id: string;
  role_slug: string;
  status: string;
}

/** `GET /api/v1/organizations` */
export interface OrganizationItem {
  id: string;
  customer_id: string;
  name: string;
  slug: string;
  status: string;
  role_slug: string | null;
  created_at: string;
  approved_at: string | null;
}

/** `GET /api/v1/users?status=pending` */
export interface PendingUser {
  user_id: string;
  email: string | null;
  name: string | null;
  account_status: string;
  email_verified: boolean;
  created_at: string;
  approved_at: string | null;
}

/** `GET /api/v1/me` */
export interface MeResponse {
  user_id: string;
  email: string | null;
  name: string | null;
  /** Raw `neon_auth.user.role`; `is_platform_admin` is exactly `role == "admin"`. */
  platform_role: string | null;
  is_platform_admin: boolean;
  account_status: string;
  email_verified: boolean;
  must_change_password: boolean;
  memberships: Membership[];
}

/** `POST /api/v1/auth/status` */
export interface AccountStatusResponse {
  email: string;
  status: "pending" | "active" | "suspended" | "rejected" | "not_found";
  name: string | null;
  email_verified: boolean;
  created_at: string | null;
  approved_at: string | null;
}
