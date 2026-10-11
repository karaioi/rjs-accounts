"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "cn";
import { Fragment } from "react";

/**
 * A 6-digit code as the shadcn `InputOTP`. The slots are split into three
 * pairs (2–2–2) with dividers between them, so the code is easier to read
 * back and transcribe than one unbroken row of six boxes.
 */
const PAIRS = [
  [0, 1],
  [2, 3],
  [4, 5],
] as const;

const SLOT_COUNT = PAIRS.flat().length;

export function OtpField({
  id,
  name,
  value,
  invalid,
  onChange,
  onBlur,
  className,
}: {
  id: string;
  name: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  className?: string;
}) {
  return (
    <InputOTP
      id={id}
      name={name}
      maxLength={SLOT_COUNT}
      inputMode="numeric"
      autoComplete="one-time-code"
      value={value}
      onChange={(next) => onChange(next.replace(/\D/g, ""))}
      onBlur={onBlur}
      aria-invalid={invalid}
      containerClassName={cn("justify-center", className)}
    >
      {PAIRS.map((pair, pairIndex) => (
        <Fragment key={pair[0]}>
          {pairIndex > 0 && <InputOTPSeparator />}
          <InputOTPGroup>
            {pair.map((slot) => (
              <InputOTPSlot
                key={slot}
                index={slot}
                aria-invalid={invalid}
                className="size-10 text-base sm:size-11 sm:text-lg"
              />
            ))}
          </InputOTPGroup>
        </Fragment>
      ))}
    </InputOTP>
  );
}
