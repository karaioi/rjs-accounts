"use client";

import {
  ArrowLeft01Icon,
  LoaderIcon,
  Mail01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { FormMessage } from "@/components/auth-message";
import { Collapse } from "@/components/motion/collapse";
import { Reveal } from "@/components/motion/reveal";
import { SPRING_SOFT } from "@/components/motion/variants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { checkAccountStatus } from "@/lib/api/actions";
import type { AccountStatusResponse } from "@/lib/api/types";
import type { PendingStatusFormProps } from "@/lib/data/pending";
import { StatusDialog } from "./status-dialog";

export function PendingStatusForm({
  initialEmail = "",
  initialStatus = null,
}: PendingStatusFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AccountStatusResponse | null>(
    initialStatus,
  );
  const [dialogOpen, setDialogOpen] = useState<boolean>(initialStatus !== null);

  async function handleCheck(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail?.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const response = await checkAccountStatus(cleanEmail);
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setResult(response.data);
      setDialogOpen(true);
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Reveal variant="scale-in" className="w-full max-w-md">
      <Card className="relative w-full rounded-3xl border-black/10 bg-[#fffafa]/70 shadow-[0_24px_80px_-32px_rgba(8,47,73,0.4)]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Check account status
          </CardTitle>
          <CardDescription>
            Enter your email to verify your registration and approval status in
            real time.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <form onSubmit={handleCheck} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="status-email">Email address</FieldLabel>
              <InputGroup className="h-11 rounded-xl">
                <InputGroupAddon align="inline-start">
                  <HugeiconsIcon
                    icon={Mail01Icon}
                    size={16}
                    strokeWidth={1.5}
                    className="text-muted-foreground ml-2.5"
                  />
                </InputGroupAddon>
                <InputGroupInput
                  id="status-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-2 text-base md:text-base"
                />
              </InputGroup>
            </Field>

            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={SPRING_SOFT}
            >
              <Button
                type="submit"
                disabled={pending || !email.trim()}
                className="w-full rounded-xl shadow-lg shadow-brand-green/25"
              >
                {pending ? (
                  <HugeiconsIcon
                    icon={LoaderIcon}
                    size={16}
                    strokeWidth={1.5}
                    className="animate-spin"
                  />
                ) : (
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={16}
                    strokeWidth={1.5}
                  />
                )}
                {pending ? "Checking status…" : "Check status"}
              </Button>
            </motion.div>
          </form>

          <Collapse show={error !== null}>
            {error && <FormMessage tone="error">{error}</FormMessage>}
          </Collapse>

          <StatusDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            result={result}
          />

          <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-4 text-sm">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-medium text-brand-blue underline-offset-4 hover:text-brand-blue/80 hover:underline"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={14}
                strokeWidth={1.5}
              />
              Back to sign in
            </Link>

            <Link
              href="/sign-up"
              className="font-medium text-brand-blue underline-offset-4 hover:text-brand-blue/80 hover:underline"
            >
              Request access
            </Link>
          </div>
        </CardContent>
      </Card>
    </Reveal>
  );
}
