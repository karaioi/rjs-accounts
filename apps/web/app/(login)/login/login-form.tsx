"use client";

import {
  CustomerServiceIcon,
  EyeIcon,
  EyeOffIcon,
  LegalDocument01Icon,
  LoaderIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import * as z from "zod";
import { Collapse } from "@/components/motion/collapse";
import { Reveal } from "@/components/motion/reveal";
import { SPRING_POP, SPRING_SOFT } from "@/components/motion/variants";
import { PasswordRequirements } from "@/components/password-requirements";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters.")
    .max(64, "Password must be at most 64 characters.")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
    .regex(/[a-z]/, "Password must include at least one lowercase letter.")
    .regex(/[0-9]/, "Password must include at least one number.")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must include at least one special character.",
    ),
  termsAccepted: z
    .boolean()
    .refine((value) => value, "You must accept the Terms & Conditions."),
  privacyAccepted: z
    .boolean()
    .refine((value) => value, "You must accept the Privacy Policy."),
});

const consents = [
  {
    name: "termsAccepted",
    text: "I agree to the",
    linkLabel: "Terms & Conditions",
    href: "/terms",
    icon: LegalDocument01Icon,
  },
  {
    name: "privacyAccepted",
    text: "I have read the",
    linkLabel: "Privacy Policy",
    href: "/privacy",
    icon: Shield01Icon,
  },
] as const;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      termsAccepted: false,
      privacyAccepted: false,
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: () => {
      // TODO: call the authentication API once it exists.
    },
  });

  return (
    <Reveal variant="scale-in" className="w-full max-w-md">
      <Card className="relative w-full rounded-3xl border-black/10 bg-[#fffafa]/70 shadow-[0_24px_80px_-32px_rgba(8,47,73,0.4)]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Sign in
          </CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="login-form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup className="gap-4">
              <form.Field name="email">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Reveal delay={0.12}>
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="email"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          aria-invalid={isInvalid}
                          placeholder="you@example.com"
                          autoComplete="email"
                          className="h-11 rounded-xl px-3.5 text-base md:text-base focus-visible:border-brand-blue focus-visible:ring-brand-blue/15"
                        />
                        <Collapse show={isInvalid}>
                          <FieldError errors={field.state.meta.errors} />
                        </Collapse>
                      </Field>
                    </Reveal>
                  );
                }}
              </form.Field>

              <form.Field name="password">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Reveal delay={0.19}>
                      <Field data-invalid={isInvalid}>
                        <div className="flex items-center justify-between gap-2">
                          <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                          <a
                            href="/forgot-password"
                            className="text-sm font-medium text-brand-blue underline-offset-4 hover:text-brand-blue/80 hover:underline"
                          >
                            Forgot password?
                          </a>
                        </div>
                        <InputGroup className="h-11 rounded-xl">
                          <InputGroupInput
                            id={field.name}
                            name={field.name}
                            type={showPassword ? "text" : "password"}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            aria-invalid={isInvalid}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="px-3.5 text-base md:text-base"
                          />
                          <InputGroupAddon align="inline-end">
                            <InputGroupButton
                              type="button"
                              size="icon-xs"
                              onClick={() =>
                                setShowPassword((visible) => !visible)
                              }
                              aria-label={
                                showPassword ? "Hide password" : "Show password"
                              }
                            >
                              <AnimatePresence mode="wait" initial={false}>
                                <motion.span
                                  key={showPassword ? "hide" : "show"}
                                  initial={{ opacity: 0, scale: 0.6 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.6 }}
                                  transition={SPRING_POP}
                                  className="grid place-items-center"
                                >
                                  <HugeiconsIcon
                                    icon={showPassword ? EyeOffIcon : EyeIcon}
                                    size={16}
                                    strokeWidth={1.5}
                                  />
                                </motion.span>
                              </AnimatePresence>
                            </InputGroupButton>
                          </InputGroupAddon>
                        </InputGroup>
                        <Collapse show={field.state.value.length > 0}>
                          <PasswordRequirements value={field.state.value} />
                        </Collapse>
                        <Collapse
                          show={isInvalid && field.state.value.length === 0}
                        >
                          <FieldError errors={field.state.meta.errors} />
                        </Collapse>
                      </Field>
                    </Reveal>
                  );
                }}
              </form.Field>

              {consents.map((consent, index) => (
                <form.Field key={consent.name} name={consent.name}>
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;

                    return (
                      <Reveal delay={0.26 + index * 0.06}>
                        <Field data-invalid={isInvalid}>
                          <div className="flex items-center gap-2.5">
                            <Checkbox
                              id={field.name}
                              name={field.name}
                              checked={field.state.value}
                              onCheckedChange={(checked) =>
                                field.handleChange(checked === true)
                              }
                              onBlur={field.handleBlur}
                              aria-invalid={isInvalid}
                            />
                            <FieldLabel
                              htmlFor={field.name}
                              className="font-normal"
                            >
                              {consent.text}{" "}
                              <a
                                href={consent.href}
                                className="inline-flex items-center gap-1 font-medium text-brand-blue underline-offset-4 hover:text-brand-blue/80 hover:underline"
                              >
                                <HugeiconsIcon
                                  icon={consent.icon}
                                  size={14}
                                  strokeWidth={1.5}
                                />
                                {consent.linkLabel}
                              </a>
                            </FieldLabel>
                          </div>
                          <Collapse show={isInvalid}>
                            <FieldError errors={field.state.meta.errors} />
                          </Collapse>
                        </Field>
                      </Reveal>
                    );
                  }}
                </form.Field>
              ))}
            </FieldGroup>

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Reveal delay={0.4} className="mt-7">
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    transition={SPRING_SOFT}
                  >
                    <Button
                      type="submit"
                      form="login-form"
                      className="w-full rounded-xl shadow-lg shadow-brand-green/25"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && (
                        <HugeiconsIcon
                          icon={LoaderIcon}
                          size={16}
                          strokeWidth={1.5}
                          className="animate-spin"
                        />
                      )}
                      {isSubmitting ? "Signing in..." : "Sign in"}
                    </Button>
                  </motion.div>
                </Reveal>
              )}
            </form.Subscribe>
          </form>

          <Reveal delay={0.46}>
            <p className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <span>Don&apos;t have an account?</span>
              <a
                href="/contact"
                className="inline-flex items-center gap-1.5 font-medium text-brand-blue underline-offset-4 hover:text-brand-blue/80 hover:underline"
              >
                <HugeiconsIcon
                  icon={CustomerServiceIcon}
                  size={16}
                  strokeWidth={1.5}
                />
                Contact us
              </a>
            </p>
          </Reveal>
        </CardContent>
      </Card>
    </Reveal>
  );
}
