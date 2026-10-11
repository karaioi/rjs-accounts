import { LegalDocument01Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { LoginValues } from "@/lib/validations/login";

/** A required consent checkbox whose label links to a policy document. */
export interface Consent {
  /** Field name in `loginSchema` (`@/lib/validations/login`). */
  name: keyof LoginValues;
  /** Lead-in text before the link, e.g. "I agree to the". */
  text: string;
  /** Anchor label, e.g. "Terms & Conditions". */
  linkLabel: string;
  /** Where the link points. */
  href: string;
  /** HugeIcons icon data. */
  icon: IconSvgElement;
}

/**
 * Consents shown on the login form. Tied to `loginSchema` via the `name`
 * field so adding/removing one can't silently drift from validation.
 */
export const consents = [
  {
    name: "termsAccepted",
    text: "I agree to the",
    linkLabel: "Terms & Conditions",
    href: "/terms",
    icon: LegalDocument01Icon,
  },
  {
    name: "privacyAccepted",
    text: "I have read the",
    linkLabel: "Privacy Policy",
    href: "/privacy",
    icon: Shield01Icon,
  },
] as const satisfies readonly Consent[];
