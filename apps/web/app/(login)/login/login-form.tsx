"use client";

import {
  ArrowLeft01Icon,
  EyeIcon,
  EyeOffIcon,
  LoaderIcon,
  Mail01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  cancelSignIn as cancelSignInAction,
  completeSignIn as completeSignInAction,
  sendSignInCode,
  startSignIn as startSignInAction,
  verifyCode,
} from "@/lib/auth/actions";
import { type LoginValues, loginSchema } from "@/lib/validations/login";
import { otpSchema } from "@/lib/validations/otp";

import type { LoginFormProps, LoginStep } from "@/lib/data/auth";

export function LoginForm({ initialEmail = null }: LoginFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<LoginStep>(
    initialEmail ? "otp" : "credentials",
  );
  const [email, setEmail] = useState(initialEmail ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      await startSignIn(value);
    },
  });

  const otpForm = useForm({
    defaultValues: { otp: "" },
    validators: {
      onSubmit: otpSchema,
    },
    onSubmit: async ({ value }) => {
      await completeSignIn(value.otp);
    },
  });

  /** Step 1: verify the password, then send the email OTP. */
  async function startSignIn(value: LoginValues) {
    setError(null);
    setNotice(null);
    setPending(true);

    try {
      const result = await startSignInAction({
        email: value.email,
        password: value.password,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      // The session now exists, so the gate can be opened for it. This is a
      // separate action because Managed Auth reads the session from the
      // *request*, so a cookie set in the previous action only becomes visible
      // to the next one.
      const code = await sendSignInCode({ email: value.email });
      if (!code.ok) {
        setError(code.message);
        return;
      }

      setEmail(value.email);
      otpForm.reset();
      setStep("otp");
    } catch {
      setError("We couldn't sign you in. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  /** Step 2: confirm the code, then release access. */
  async function completeSignIn(otp: string) {
    setError(null);
    setNotice(null);
    setPending(true);

    try {
      const verified = await verifyCode({ email, otp });
      if (!verified.ok) {
        setError(verified.message);
        return;
      }

      // Again a separate action: `verifyCode` refreshed the session cookie, and
      // the backend gate has to be released with that fresh token.
      const result = await completeSignInAction();

      if (!result.ok) {
        setError(result.message);
        return;
      }

      router.push(result.destination);
      router.refresh();
    } catch {
      setError("We couldn't verify that code. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function resendCode() {
    setError(null);
    setNotice(null);
    setPending(true);

    try {
      const result = await sendSignInCode({ email, resend: true });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setNotice("A new code is on its way.");
    } catch {
      setError("We couldn't resend the code. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Reveal variant="scale-in" className="w-full max-w-md">
      <Card className="relative w-full rounded-3xl border-black/10 bg-[#fffafa]/70 shadow-[0_24px_80px_-32px_rgba(8,47,73,0.4)]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {step === "credentials" ? "Sign in" : "Verify your email"}
          </CardTitle>
          <CardDescription>
            {step === "credentials"
              ? "Enter your credentials to access your account."
              : `We sent a 6-digit code to ${email}.`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait" initial={false}>
            {step === "credentials" ? (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRING_SOFT}
              >
                <form
                  id="login-form"
                  method="post"
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
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;

                        return (
                          <Reveal delay={0.12}>
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
                          <Reveal delay={0.19}>
                            <Field data-invalid={isInvalid}>
                              <div className="flex items-center justify-between gap-2">
                                <FieldLabel htmlFor={field.name}>
                                  Password
                                </FieldLabel>
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
                              <Collapse
                                show={
                                  field.state.value.length > 0 && !isInvalid
                                }
                              >
                                <PasswordRequirements
                                  value={field.state.value}
                                />
                              </Collapse>
                              <Collapse show={isInvalid}>
                                <FieldError errors={field.state.meta.errors} />
                              </Collapse>
                            </Field>
                          </Reveal>
                        );
                      }}
                    </form.Field>
                  </FieldGroup>

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
                        {pending ? "Signing in..." : "Sign in"}
                      </Button>
                    </motion.div>
                  </Reveal>
                </form>

                <Reveal delay={0.46}>
                  <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-muted-foreground">
                    <span>
                      Don&apos;t have an account?{" "}
                      <Link
                        href="/sign-up"
                        className="font-medium text-brand-blue underline-offset-4 hover:text-brand-blue/80 hover:underline"
                      >
                        Request access
                      </Link>
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-muted-foreground/40"
                    >
                      |
                    </span>
                    <Link
                      href="/pending"
                      className="font-medium text-brand-blue underline-offset-4 hover:text-brand-blue/80 hover:underline"
                    >
                      Check status
                    </Link>
                  </p>
                </Reveal>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRING_SOFT}
              >
                <form
                  id="otp-form"
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
                        form="otp-form"
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
                        {pending ? "Verifying..." : "Verify and continue"}
                      </Button>
                    </motion.div>

                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-xl text-muted-foreground"
                        onClick={async () => {
                          setError(null);
                          setNotice(null);
                          // Drop the pending-step cookie too, so a reload stays
                          // on the credentials screen instead of jumping back.
                          await cancelSignInAction();
                          setEmail("");
                          setStep("credentials");
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
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        <ErrorDialog
          title={
            step === "otp"
              ? "Couldn't verify your code"
              : "Couldn't sign you in"
          }
          message={error}
          onClose={() => setError(null)}
        />
      </Card>
    </Reveal>
  );
}
