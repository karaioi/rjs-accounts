"use client";

import { type HTMLMotionProps, motion } from "motion/react";
import {
  ENTER_TRANSITION,
  fadeIn,
  fadeUp,
  scaleIn,
  staggerContainer,
} from "./variants";

const variantsByVariant = {
  "fade-up": fadeUp,
  "fade-in": fadeIn,
  "scale-in": scaleIn,
} as const;

export type RevealVariant = keyof typeof variantsByVariant;

interface RevealProps extends HTMLMotionProps<"div"> {
  variant?: RevealVariant;
  /** Seconds to wait before animating in. */
  delay?: number;
}

/**
 * Animates a single element into view on mount.
 *
 * Use for standalone elements; use {@link Stagger}/{@link StaggerItem} when a
 * group of siblings should animate in sequence.
 */
export function Reveal({
  variant = "fade-up",
  delay = 0,
  transition,
  className,
  children,
  ...props
}: RevealProps) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={variantsByVariant[variant]}
      transition={{ ...ENTER_TRANSITION, delay, ...transition }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerProps extends HTMLMotionProps<"div"> {
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

/** A container whose {@link StaggerItem} children animate in sequence. */
export function Stagger({
  stagger = 0.09,
  delay = 0,
  inherit = false,
  className,
  children,
  ...props
}: StaggerProps) {
  const trigger = inherit
    ? {}
    : { initial: "hidden" as const, animate: "show" as const };

  return (
    <motion.div
      {...trigger}
      variants={staggerContainer(stagger, delay)}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  variant?: RevealVariant;
}

/** A child of {@link Stagger}; inherits the entrance sequence. */
export function StaggerItem({
  variant = "fade-up",
  transition,
  className,
  children,
  ...props
}: StaggerItemProps) {
  return (
    <motion.div
      variants={variantsByVariant[variant]}
      transition={{ ...ENTER_TRANSITION, ...transition }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
