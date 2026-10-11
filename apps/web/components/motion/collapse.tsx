"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { SWIFT_TRANSITION } from "./variants";

interface CollapseProps {
  show: boolean;
  children: ReactNode;
  className?: string;
}

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
