import Image from "next/image";
import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { PromoPanel } from "@/components/promo-panel";
import { promo } from "@/lib/data/promo";

/**
 * Split layout shared by the unauthenticated screens — sign in, sign up, and
 * pending approval — so they stay visually identical: brand panel on the left,
 * form column on the right.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-screen flex justify-between items-center">
      <PromoPanel
        className="w-[60%]"
        logo={
          <Image
            src={"/login-logo.png"}
            width={4501}
            height={1227}
            alt="rjs-accounts-logo"
            loading="eager"
            className="w-42 h-auto object-contain"
          />
        }
        {...promo}
      />

      <div className="w-[40%] h-full relative overflow-hidden flex flex-col justify-center items-center">
        <Reveal variant="fade-in" delay={0.05} className="mb-8">
          <Image
            src={"/logo.png"}
            width={4501}
            height={1227}
            alt="rjs-accounts-logo"
            loading="eager"
            className="relative w-15 object-contain"
          />
        </Reveal>

        {children}
      </div>
    </div>
  );
}
