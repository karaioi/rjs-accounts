"use client";

import {
  ArrowLeft01Icon,
  EyeIcon,
  EyeOffIcon,
  LoaderIcon,
  Mail01Icon,
  RefreshIcon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { FormMessage } from "@/components/auth-message";
import { ErrorDialog } from "@/components/error-dialog";
import { Collapse } from "@/components/motion/collapse";
import { Reveal } from "@/components/motion/reveal";
import { SPRING_POP, SPRING_SOFT } from "@/components/motion/variants";
import { OtpField } from "@/components/otp-field";
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
import { registerAccount } from "@/lib/api/actions";
import { authClient } from "@/lib/auth/client";
import { describeAuthError } from "@/lib/auth/errors";
import { consents } from "@/lib/data/consents";
import { otpSchema } from "@/lib/validations/otp";
import { type SignUpValues, signUpSchema } from "@/lib/validations/sign-up";

type Step = "details" | "otp" | "pending";

function StepShell({ children }: { children: ReactNode }) {
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

export function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      termsAccepted: false,
      privacyAccepted: false,
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      await createAccount(value);
    },
  });

  const otpForm = useForm({
    defaultValues: { otp: "" },
    validators: {
      onSubmit: otpSchema,
    },
    onSubmit: async ({ value }) => {
      await verifyEmail(value.otp);
    },
  });

  /** Step 1: create the identity, then send the verification code. */
  async function createAccount(value: SignUpValues) {
    setError(null);
    setNotice(null);
    setPending(true);

    try {
      const { error: signUpError } = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.name,
      });

      if (signUpError) {
        setError(
          describeAuthError(
            signUpError,
            "We could not create your account. Please try again.",
          ),
        );
        return;
      }

      const { error: otpError } = await authClient.emailOtp.sendVerificationOtp(
        {
          email: value.email,
          type: "email-verification",
        },
      );

      if (otpError) {
        setError(
          describeAuthError(otpError, "Could not send the verification code."),
        );
        return;
      }

      setEmail(value.email);
      otpForm.reset();
      setStep("otp");
    } catch (error) {
      setError(
        describeAuthError(
          error,
          "We couldn't create your account. Please try again.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  /** Step 2: confirm the email, then register the account for approval. */
  async function verifyEmail(otp: string) {
    setError(null);
    setNotice(null);
    setPending(true);

    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      });

      if (verifyError) {
        setError(describeAuthError(verifyError, "That code is not valid."));
        return;
      }

      // Hand the account to our approval workflow (`app.user_profile`).
      const registration = await registerAccount();
      if (!registration.ok) {
        setError(registration.message);
        return;
      }

      setStep("pending");
    } catch (error) {
      setError(
        describeAuthError(
          error,
          "We couldn't verify that code. Please try again.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  async function resendCode() {
    setError(null);
    setNotice(null);
    setPending(true);

    try {
      const { error: otpError } = await authClient.emailOtp.sendVerificationOtp(
        {
          email,
          type: "email-verification",
        },
      );

      if (otpError) {
        setError(describeAuthError(otpError, "Could not resend the code."));
        return;
      }

      setNotice("A new code is on its way.");
    } catch (error) {
      setError(
        describeAuthError(
          error,
          "We couldn't resend the code. Please try again.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  const title =
    step === "details"
      ? "Create your account"
      : step === "otp"
        ? "Verify your email"
        : "Account created";

  const description =
    step === "details"
      ? "Request access to rjs-accounts."
      : step === "otp"
        ? `We sent a 6-digit code to ${email}.`
        : "Your request is with our team for approval.";

  return (
    <Reveal variant="scale-in" className="w-full max-w-md">
      <Card className="relative w-full rounded-3xl border-black/10 bg-[#fffafa]/70 shadow-[0_24px_80px_-32px_rgba(8,47,73,0.4)]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait" initial={false}>
            {step === "details" && (
              <StepShell key="details">
                <form
                  id="sign-up-form"
                  method="post"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    form.handleSubmit();
                  }}
                >
                  <FieldGroup className="gap-4">
                    <form.Field name="name">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;

                        return (
                          <Reveal delay={0.08}>
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                Full name
                              </FieldLabel>
                              <Input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
                                aria-invalid={isInvalid}
                                placeholder="Jane Doe"
                                autoComplete="name"
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

                    <form.Field name="email">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;

                        return (
                          <Reveal delay={0.14}>
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                Email
                              </FieldLabel>
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
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;

                        return (
                          <Reveal delay={0.2}>
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                Password
                              </FieldLabel>
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
                                  autoComplete="new-password"
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
                                      showPassword
                                        ? "Hide password"
                                        : "Show password"
                                    }
                                  >
                                    <AnimatePresence
                                      mode="wait"
                                      initial={false}
                                    >
                                      <motion.span
                                        key={showPassword ? "hide" : "show"}
                                        initial={{ opacity: 0, scale: 0.6 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.6 }}
                                        transition={SPRING_POP}
                                        className="grid place-items-center"
                                      >
                                        <HugeiconsIcon
                                          icon={
                                            showPassword ? EyeOffIcon : EyeIcon
                                          }
                                          size={16}
                                          strokeWidth={1.5}
                                        />
                                      </motion.span>
                                    </AnimatePresence>
                                  </InputGroupButton>
                                </InputGroupAddon>
                              </InputGroup>
                              <PasswordRequirements value={field.state.value} />
                              <Collapse show={isInvalid}>
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
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;

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
                                  <FieldError
                                    errors={field.state.meta.errors}
                                  />
                                </Collapse>
                              </Field>
                            </Reveal>
                          );
                        }}
                      </form.Field>
                    ))}
                  </FieldGroup>

                  <Reveal delay={0.4} className="mt-7">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      transition={SPRING_SOFT}
                    >
                      <Button
                        type="submit"
                        form="sign-up-form"
                        className="w-full rounded-xl shadow-lg shadow-brand-green/25"
                        disabled={pending}
                      >
                        {pending && (
                          <HugeiconsIcon
                            icon={LoaderIcon}
                            size={16}
                            strokeWidth={1.5}
                            className="animate-spin"
                          />
                        )}
                        {pending ? "Creating account..." : "Create account"}
                      </Button>
                    </motion.div>
                  </Reveal>
                </form>

                <Reveal delay={0.46}>
                  <p className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <span>Already have an account?</span>
                    <Link
                      href="/login"
                      className="font-medium text-brand-blue underline-offset-4 hover:text-brand-blue/80 hover:underline"
                    >
                      Sign in
                    </Link>
                  </p>
                </Reveal>
              </StepShell>
            )}

            {step === "otp" && (
              <StepShell key="otp">
                <form
                  id="sign-up-otp-form"
                  method="post"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    otpForm.handleSubmit();
                  }}
                >
                  <FieldGroup className="gap-4">
                    <otpForm.Field name="otp">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;

                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Verification code
                            </FieldLabel>
                            <OtpField
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              invalid={isInvalid}
                              onChange={field.handleChange}
                              onBlur={field.handleBlur}
                            />
                            <Collapse show={isInvalid}>
                              <FieldError errors={field.state.meta.errors} />
                            </Collapse>
                          </Field>
                        );
                      }}
                    </otpForm.Field>
                  </FieldGroup>

                  {notice && (
                    <div className="mt-4">
                      <FormMessage tone="success">{notice}</FormMessage>
                    </div>
                  )}

                  <div className="mt-7 space-y-3">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      transition={SPRING_SOFT}
                    >
                      <Button
                        type="submit"
                        form="sign-up-otp-form"
                        className="w-full rounded-xl shadow-lg shadow-brand-green/25"
                        disabled={pending}
                      >
                        {pending && (
                          <HugeiconsIcon
                            icon={LoaderIcon}
                            size={16}
                            strokeWidth={1.5}
                            className="animate-spin"
                          />
                        )}
                        {pending ? "Verifying..." : "Verify email"}
                      </Button>
                    </motion.div>

                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-xl text-muted-foreground"
                        onClick={() => {
                          setError(null);
                          setNotice(null);
                          setStep("details");
                        }}
                        disabled={pending}
                      >
                        <HugeiconsIcon
                          icon={ArrowLeft01Icon}
                          size={16}
                          strokeWidth={1.5}
                        />
                        Back
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-xl text-brand-blue"
                        onClick={resendCode}
                        disabled={pending}
                      >
                        <HugeiconsIcon
                          icon={RefreshIcon}
                          size={16}
                          strokeWidth={1.5}
                        />
                        Resend code
                      </Button>
                    </div>
                  </div>
                </form>

                <Reveal delay={0.2}>
                  <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                    <HugeiconsIcon
                      icon={Mail01Icon}
                      size={16}
                      strokeWidth={1.5}
                    />
                    <span>
                      Codes expire shortly. Check spam if it is missing.
                    </span>
                  </p>
                </Reveal>
              </StepShell>
            )}

            {step === "pending" && (
              <StepShell key="pending">
                <div className="flex flex-col items-center gap-4 text-center">
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={SPRING_POP}
                    className="grid size-14 place-items-center rounded-2xl bg-brand-green/10 text-brand-green"
                  >
                    <HugeiconsIcon
                      icon={SecurityCheckIcon}
                      size={28}
                      strokeWidth={1.5}
                    />
                  </motion.span>

                  <p className="text-sm text-muted-foreground">
                    Your email is verified. An administrator will review your
                    request — you&apos;ll be able to sign in as soon as access
                    is granted.
                  </p>

                  <Link
                    href="/login"
                    className="text-sm font-medium text-brand-blue underline-offset-4 hover:text-brand-blue/80 hover:underline"
                  >
                    Back to sign in
                  </Link>
                </div>
              </StepShell>
            )}
          </AnimatePresence>
        </CardContent>

        <ErrorDialog
          title={
            step === "details"
              ? "Couldn't create your account"
              : "Couldn't verify your code"
          }
          message={error}
          onClose={() => setError(null)}
        />
      </Card>
    </Reveal>
  );
}
