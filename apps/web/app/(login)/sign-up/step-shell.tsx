"use client";

import { motion } from "motion/react";
import { SPRING_SOFT } from "@/components/motion/variants";
import type { StepShellProps } from "@/lib/data/auth";

export function StepShell({ children }: StepShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={SPRING_SOFT}
    >
      {children}
    </motion.div>
  );
}
