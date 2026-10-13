"use client";

import { motion } from "motion/react";
import type { RevealProps, StaggerItemProps, StaggerProps } from "./types";
import {
  ENTER_TRANSITION,
  VARIANTS_BY_VARIANT,
  staggerContainer,
} from "./variants";

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
      variants={VARIANTS_BY_VARIANT[variant]}
      transition={{ ...ENTER_TRANSITION, delay, ...transition }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
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
      variants={VARIANTS_BY_VARIANT[variant]}
      transition={{ ...ENTER_TRANSITION, ...transition }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
