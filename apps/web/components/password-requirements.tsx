"use client";

import { CheckmarkCircle01Icon, CircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_POP } from "@/components/motion/variants";

const passwordRules: { test: (value: string) => boolean; label: string }[] = [
  {
    test: (value) => value.length >= 12,
    label: "At least 12 characters",
  },
  {
    test: (value) => /[A-Z]/.test(value),
    label: "At least one uppercase letter",
  },
  {
    test: (value) => /[a-z]/.test(value),
    label: "At least one lowercase letter",
  },
  {
    test: (value) => /[0-9]/.test(value),
    label: "At least one number",
  },
  {
    test: (value) => /[^A-Za-z0-9]/.test(value),
    label: "At least one special character",
  },
];

interface PasswordRequirementsProps {
  value: string;
  className?: string;
}

export function PasswordRequirements({
  value,
  className,
}: PasswordRequirementsProps) {
  return (
    <ul className={cn("flex flex-col gap-1 text-sm", className)}>
      {passwordRules.map((rule) => {
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
