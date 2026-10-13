export interface PasswordRule {
  test: (value: string) => boolean;
  label: string;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    test: (value) => value.length >= 8,
    label: "At least 8 characters",
  },
  {
    test: (value) => /[A-Z]/.test(value),
    label: "At least one uppercase letter",
  },
  {
    test: (value) => /[a-z]/.test(value),
    label: "At least one lowercase letter",
  },
  {
    test: (value) => /[0-9]/.test(value),
    label: "At least one number",
  },
  {
    test: (value) => /[^A-Za-z0-9]/.test(value),
    label: "At least one special character",
  },
];

export interface PasswordRequirementsProps {
  value: string;
  className?: string;
}
