import { LegalDocument01Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

/**
 * The consent checkboxes required by both `loginSchema` and `signUpSchema`, kept
 * as a literal union so this list can't silently drift from either form.
 */
export type ConsentField = "termsAccepted" | "privacyAccepted";

/** A required consent checkbox whose label links to a policy document. */
export interface Consent {
  /** Field name shared by the login and sign-up schemas. */
  name: ConsentField;
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
 * Consents shown on the sign-in and sign-up forms. Tied to the shared schemas
 * via the `name` field so adding/removing one can't drift from validation.
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
