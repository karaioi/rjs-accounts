import Image from "next/image";

import { Reveal } from "@/components/motion/reveal";
import { PromoPanel } from "@/components/promo-panel";
import { promo } from "@/lib/data/promo";
import { LoginForm } from "./login-form";

export default function Login() {
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
            className="w-32 h-auto object-cover"
          />
        }
        {...promo}
      />

      <div className="w-[40%] h-full relative overflow-hidden flex flex-col justify-center items-center">
        <Reveal variant="fade-in" delay={0.05} className="mb-8">
          <Image
            src={"/login-logo.png"}
            width={4501}
            height={1227}
            alt="rjs-accounts-logo"
            loading="eager"
            className="relative w-42 object-contain"
          />
        </Reveal>

        <LoginForm />
      </div>
    </div>
  );
}
