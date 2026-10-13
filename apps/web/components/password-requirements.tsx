"use client";

import { CheckmarkCircle01Icon, CircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_POP } from "@/components/motion/variants";
import {
  PASSWORD_RULES,
  type PasswordRequirementsProps,
} from "@/lib/data/password";

export function PasswordRequirements({
  value,
  className,
}: PasswordRequirementsProps) {
  return (
    <ul className={cn("flex flex-col gap-1 text-sm", className)}>
      {PASSWORD_RULES.map((rule) => {
        const satisfied = rule.test(value);

        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              satisfied ? "text-brand-green" : "text-muted-foreground",
            )}
          >
            <span className="relative grid size-4 shrink-0 place-items-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={satisfied ? "satisfied" : "pending"}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={SPRING_POP}
                  className="absolute grid place-items-center"
                >
                  <HugeiconsIcon
                    icon={satisfied ? CheckmarkCircle01Icon : CircleIcon}
                    size={16}
                    strokeWidth={1.5}
                  />
                </motion.span>
              </AnimatePresence>
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
