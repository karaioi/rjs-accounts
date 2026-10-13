import type { AccountStatusResponse } from "@/lib/api/types";

export type PendingStatus =
  | "pending"
  | "active"
  | "suspended"
  | "rejected"
  | "not_found";

export interface PendingStatusFormProps {
  initialEmail?: string;
  initialStatus?: AccountStatusResponse | null;
}

export interface PendingPageProps {
  searchParams: Promise<{ email?: string }>;
}

export interface StatusDialogProps {
  open: boolean;
  onClose: () => void;
  result: AccountStatusResponse | null;
}

export interface StatusConfig {
  tone: "warning" | "success" | "destructive" | "muted";
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export const STATUS_CONFIG: Record<PendingStatus, StatusConfig> = {
  pending: {
    tone: "warning",
    title: "Organization awaiting approval",
    description:
      "Your organization workspace has been registered. An administrator has not approved it yet. You will be able to access your workspace once approved.",
  },
  active: {
    tone: "success",
    title: "Account active & approved",
    description:
      "Your account has been approved and is fully active. You can sign in to access your workspace.",
    actionLabel: "Sign in now",
    actionHref: "/login",
  },
  rejected: {
    tone: "destructive",
    title: "Request declined",
    description:
      "Your access request was reviewed and declined by an administrator. Please reach out to your team admin if you believe this is a mistake.",
    actionLabel: "Submit new request",
    actionHref: "/sign-up",
  },
  suspended: {
    tone: "destructive",
    title: "Account suspended",
    description:
      "Your account is currently suspended. Please contact your organization administrator or support for assistance.",
  },
  not_found: {
    tone: "muted",
    title: "No account found",
    description:
      "We couldn't find an account matching this email address. Please check for typos or request access to get started.",
    actionLabel: "Request access",
    actionHref: "/sign-up",
  },
};
