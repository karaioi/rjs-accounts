"use client";

import { AnimatePresence, motion } from "motion/react";
import type { CollapseProps } from "./types";
import { SWIFT_TRANSITION } from "./variants";

/**
 * Animates a block in and out by height, so content like validation errors or
 * helper text doesn't pop the layout.
 */
export function Collapse({ show, children, className }: CollapseProps) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="content"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={SWIFT_TRANSITION}
          className={className}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
