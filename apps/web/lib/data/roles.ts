/**
 * Display copy for the RBAC values the API reports.
 *
 * The API speaks in slugs: `neon_auth.user.role` for the platform level and
 * `app.role` (`owner` … `viewer`) inside an organization. Components look the
 * value up here so a raw slug — or a blank cell — never reaches the screen, and
 * an unknown slug still falls back to something readable rather than nothing.
 */

export type BadgeTone = "success" | "warning" | "danger" | "neutral";

export interface RoleCopy {
  label: string;
  description: string;
}

export interface OrgRoleCopy extends RoleCopy {
  slug: string;
}

export interface StatusCopy {
  label: string;
  tone: BadgeTone;
}

const UNKNOWN_ROLE: RoleCopy = {
  label: "Unrecognized role",
  description: "The API returned a role this build doesn't know about.",
};

/** Platform roles — the `role` column on `neon_auth.user`. */
export const platformRoles: Record<string, RoleCopy> = {
  admin: {
    label: "Platform administrator",
    description: "Approves accounts and can act in every tenant.",
  },
  user: {
    label: "Member",
    description: "Signed-in account without platform-wide privileges.",
  },
};

/** The identity with no platform flag — the ordinary case. */
const platformMember: RoleCopy = {
  label: "Member",
  description: "Signed-in account without platform-wide privileges.",
};

/** Organization roles — the seeded `app.role` rows, most privileged first. */
export const orgRoles = [
  {
    slug: "owner",
    label: "Owner",
    description: "Full control, including who belongs.",
  },
  {
    slug: "admin",
    label: "Admin",
    description: "Runs the organization day to day.",
  },
  {
    slug: "accountant",
    label: "Accountant",
    description: "Records and reconciles money.",
  },
  {
    slug: "approver",
    label: "Approver",
    description: "Signs off records submitted by others.",
  },
  {
    slug: "auditor",
    label: "Auditor",
    description: "Reads history and audit logs.",
  },
  { slug: "viewer", label: "Viewer", description: "Read-only access." },
] as const satisfies readonly OrgRoleCopy[];

/** Account states — the `status` column on `app.user_profile`. */
export const accountStatuses: Record<string, StatusCopy> = {
  active: { label: "Active", tone: "success" },
  pending: { label: "Pending approval", tone: "warning" },
  rejected: { label: "Declined", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
  archived: { label: "Archived", tone: "neutral" },
};

const orgRolesBySlug = new Map<string, OrgRoleCopy>(
  orgRoles.map((role) => [role.slug, role]),
);

/**
 * Copy for a platform role. A missing role means the identity has no platform
 * flag, which is the ordinary "Member" case — not an error.
 */
export function platformRole(role: string | null | undefined): RoleCopy {
  if (!role) {
    return platformMember;
  }
  return platformRoles[role] ?? { ...UNKNOWN_ROLE, label: role };
}

/** Copy for an organization role slug. */
export function orgRole(slug: string): OrgRoleCopy {
  return orgRolesBySlug.get(slug) ?? { ...UNKNOWN_ROLE, slug, label: slug };
}

/** Copy for an account status. */
export function accountStatus(status: string): StatusCopy {
  return accountStatuses[status] ?? { label: status, tone: "neutral" };
}
