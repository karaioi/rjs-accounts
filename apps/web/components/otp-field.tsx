"use client";

import { cn } from "cn";
import { Fragment } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { OTP_PAIRS, OTP_SLOT_COUNT, type OtpFieldProps } from "@/lib/data/auth";

export function OtpField({
  id,
  name,
  value,
  invalid,
  onChange,
  onBlur,
  className,
}: OtpFieldProps) {
  return (
    <InputOTP
      id={id}
      name={name}
      maxLength={OTP_SLOT_COUNT}
      inputMode="numeric"
      autoComplete="one-time-code"
      value={value}
      onChange={(next) => onChange(next.replace(/\D/g, ""))}
      onBlur={onBlur}
      aria-invalid={invalid}
      containerClassName={cn("justify-center", className)}
    >
      {OTP_PAIRS.map((pair, pairIndex) => (
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
