import Image from "next/image";
import Beams from "@/components/Beams";

export default function Login() {
  return (
    <div className="h-screen w-screen flex justify-between items-center p-4 gap-4">
      <div className="w-2/3 h-full relative overflow-hidden bg-black text-white rounded-3xl">
        <Beams
          color="#2A8DC6"
          beamWidth={140}
          rotation={30}
          speed={1}
          glow={0.6}
          waveLength={233}
          depth={1}
          sharpness={0.6}
          twist={0}
          fillLight={0.3}
          brightness={1.6}
          grain={0.35}
          variation={0}
          mouseInteraction
          mouseStrength={1}
          fade={0}
          opacity={1}
          intro
          lightMode={false}
        />

        <div className="absolute top-1/2 left-1/2 transform -translate-1/2"></div>
      </div>

      <div className="w-1/3 h-full relative overflow-hidden rounded-3xl border border-black p-4">
        <Image
          src={"/login-logo.png"}
          width={4501}
          height={1227}
          alt="rjs-accounts-logo"
          className="w-64 object-contain mx-auto"
        />
      </div>
    </div>
  );
}
