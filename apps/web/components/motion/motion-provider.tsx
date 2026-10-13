"use client";

import { MotionConfig } from "motion/react";
import type { MotionProviderProps } from "./types";
import { ENTER_TRANSITION } from "./variants";

/**
 * App-wide motion defaults.
 *
 * `reducedMotion="user"` makes every transform/opacity animation honour the
 * operating system's "reduce motion" setting, while still allowing opacity
 * fades, so the app stays accessible without extra work in each component.
 */
export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <MotionConfig reducedMotion="user" transition={ENTER_TRANSITION}>
      {children}
    </MotionConfig>
  );
}
