import type { Transition, Variants } from "motion/react";

/**
 * Shared motion language for the app.
 *
 * Keeping easing, durations, and variants in one place means every animation
 * feels like it belongs to the same product instead of a collection of
 * one-off effects.
 */

/** Calm, decelerating curve used for entrances. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Default entrance transition. */
export const ENTER_TRANSITION: Transition = {
  duration: 0.6,
  ease: EASE_OUT,
};

/** Faster transition for small, frequent state changes. */
export const SWIFT_TRANSITION: Transition = {
  duration: 0.3,
  ease: EASE_OUT,
};

/** Spring used for interactive feedback (hover/press). */
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 26,
  mass: 0.9,
};

/** Spring for small, snappy icon pops. */
export const SPRING_POP: Transition = {
  type: "spring",
  stiffness: 480,
  damping: 24,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1 },
};

export const VARIANTS_BY_VARIANT = {
  "fade-up": fadeUp,
  "fade-in": fadeIn,
  "scale-in": scaleIn,
} as const;

/** Parent variant that sequences its children's entrance. */
export function staggerContainer(
  staggerChildren = 0.09,
  delayChildren = 0,
): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren, delayChildren } },
  };
}
