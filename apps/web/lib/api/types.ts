/** Response shapes the web app consumes from the FastAPI backend. */

export interface Membership {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  customer_id: string;
  role_slug: string;
  status: string;
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
