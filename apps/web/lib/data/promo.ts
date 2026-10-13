import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
  Analytics01Icon,
  BanknoteIcon,
  InvoiceIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { BeamsProps } from "@/lib/data/beams";

export interface Feature {
  icon: IconSvgElement;
  title: string;
  description: string;
}

export interface FeatureCardProps {
  feature: Feature;
  className?: string;
}

export interface PromoPanelProps extends ComponentPropsWithoutRef<"div"> {
  logo?: ReactNode;
  title: string;
  description?: string;
  features?: Feature[];
  beams?: Partial<BeamsProps>;
}

export const promoFeatures: Feature[] = [
  {
    icon: BanknoteIcon,
    title: "Track income & expenses",
    description: "Every transaction logged and categorized.",
  },
  {
    icon: InvoiceIcon,
    title: "Invoices & payments",
    description: "Create, send, and track invoices with ease.",
  },
  {
    icon: Analytics01Icon,
    title: "Reports & insights",
    description: "Understand your finances at a glance.",
  },
];

export const promo = {
  title: "Accounts management that keeps your finances on track",
  description:
    "Track income, expenses, invoices, and balances in one secure place — so every financial decision is backed by numbers you can trust.",
  features: promoFeatures,
};
