import type { HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import type { VARIANTS_BY_VARIANT } from "./variants";

export type RevealVariant = keyof typeof VARIANTS_BY_VARIANT;

export interface RevealProps extends HTMLMotionProps<"div"> {
  variant?: RevealVariant;
  /** Seconds to wait before animating in. */
  delay?: number;
}

export interface StaggerProps extends HTMLMotionProps<"div"> {
  /** Seconds between each child's entrance. */
  stagger?: number;
  /** Seconds to wait before the first child animates in. */
  delay?: number;
  /**
   * When true this container won't trigger itself — it follows the nearest
   * motion parent. Use for staggering a nested group as one item of an outer
   * sequence.
   */
  inherit?: boolean;
}

export interface StaggerItemProps extends HTMLMotionProps<"div"> {
  variant?: RevealVariant;
}

export interface CollapseProps {
  show: boolean;
  children: ReactNode;
  className?: string;
}

export interface MotionProviderProps {
  children: ReactNode;
}
