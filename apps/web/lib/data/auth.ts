import type { ReactNode } from "react";

export type LoginStep = "credentials" | "otp";

export interface LoginFormProps {
  /** The account a half-finished sign-in is waiting on, from the step cookie. */
  initialEmail?: string | null;
}

export type SignUpStep = "details" | "otp" | "pending";

export interface FormMessageProps {
  tone: "error" | "success";
  children: ReactNode;
}

export interface ErrorDialogProps {
  title: string;
  message: string | null;
  onClose: () => void;
}

export const OTP_PAIRS = [
  [0, 1],
  [2, 3],
  [4, 5],
] as const;

export const OTP_SLOT_COUNT = 6;

export interface OtpFieldProps {
  id: string;
  name: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  className?: string;
}

export type SignOutButtonVariant = "full" | "icon" | "popover";

export interface SignOutButtonProps {
  variant?: SignOutButtonVariant;
}

export interface AuthShellProps {
  children: ReactNode;
}

export interface StepShellProps {
  children: ReactNode;
}
