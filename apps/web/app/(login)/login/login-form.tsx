"use client";

import { useForm } from "@tanstack/react-form";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(64, "Password must be at most 64 characters."),
});

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onBlur: loginSchema,
      onSubmit: loginSchema,
    },
    onSubmit: () => {
      // TODO: call the authentication API once it exists.
    },
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
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
          <FieldGroup>
            <form.Field name="email">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
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
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="password">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <div className="flex items-center justify-between gap-2">
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <a
                        href="/forgot-password"
                        className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        Forgot password?
                      </a>
                    </div>
                    <InputGroup>
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
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          size="icon-xs"
                          onClick={() => setShowPassword((visible) => !visible)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              form="login-form"
              className="w-full bg-[#569D3C] h-12 rounded-3xl"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          )}
        </form.Subscribe>
      </CardFooter>
    </Card>
  );
}
