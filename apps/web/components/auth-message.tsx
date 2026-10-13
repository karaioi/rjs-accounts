"use client";

import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Inline form feedback shared by the auth screens, built on the shadcn `Alert`.
 * Errors announce themselves to assistive tech; success messages are a polite
 * status.
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
      <Alert
        role={isError ? "alert" : "status"}
        variant={isError ? "destructive" : "default"}
        className={
          isError
            ? "items-center rounded-xl border-destructive/20 bg-destructive/5"
            : "items-center rounded-xl border-brand-green/20 bg-brand-green/5 text-brand-green *:data-[slot=alert-description]:text-brand-green"
        }
      >
        <HugeiconsIcon
          icon={isError ? AlertCircleIcon : CheckmarkCircle02Icon}
          size={16}
          strokeWidth={1.5}
        />
        <AlertDescription>{children}</AlertDescription>
      </Alert>
    </Reveal>
  );
}
