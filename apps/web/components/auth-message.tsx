"use client";

import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";

/**
 * Inline form feedback shared by the auth screens. Errors announce themselves
 * to assistive tech; success messages are a polite status.
 */
export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  const isError = tone === "error";

  return (
    <Reveal variant="fade-in">
      <div
        role={isError ? "alert" : "status"}
        className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
          isError
            ? "border-destructive/20 bg-destructive/5 text-destructive"
            : "border-brand-green/20 bg-brand-green/5 text-brand-green"
        }`}
      >
        <HugeiconsIcon
          icon={isError ? AlertCircleIcon : CheckmarkCircle02Icon}
          size={16}
          strokeWidth={1.5}
          className="mt-0.5 shrink-0"
        />
        <span>{children}</span>
      </div>
    </Reveal>
  );
}
