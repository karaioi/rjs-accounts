import Image from "next/image";

import { PromoPanel } from "@/components/promo-panel";
import { promo } from "@/lib/data/promo";
import { LoginForm } from "./login-form";

export default function Login() {
  return (
    <div className="h-screen w-screen flex justify-between items-center p-2 gap-4">
      <PromoPanel
        className="w-[60%]"
        logo={
          <Image
            src={"/login-logo.png"}
            width={4501}
            height={1227}
            alt="rjs-accounts-logo"
            className="w-32 h-auto object-cover"
          />
        }
        {...promo}
      />

      <div className="w-[40%] h-full relative overflow-hidden flex flex-col justify-center items-center">
        <Image
          src={"/login-logo.png"}
          width={4501}
          height={1227}
          alt="rjs-accounts-logo"
          className="w-42 mb-8 object-contain"
        />

        <LoginForm />
      </div>
    </div>
  );
}
