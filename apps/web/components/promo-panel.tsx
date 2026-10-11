import { cn } from "cn";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Beams, { type BeamsProps } from "@/components/Beams";
import { type Feature, FeatureCard } from "@/components/feature-card";

interface PromoPanelProps extends ComponentPropsWithoutRef<"div"> {
  logo?: ReactNode;
  title: string;
  description?: string;
  features?: Feature[];
  beams?: Partial<BeamsProps>;
}

export function PromoPanel({
  logo,
  title,
  description,
  features = [],
  beams,
  className,
  ...props
}: PromoPanelProps) {
  return (
    <div
      className={cn(
        "relative h-full overflow-hidden rounded-3xl bg-black text-white",
        className,
      )}
      {...props}
    >
      <Beams
        color="#2b66a9"
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
        {...beams}
      />

      <div className="absolute top-1/2 left-1/2 -translate-1/2 w-full px-15">
        {logo && <div className="mb-6">{logo}</div>}
        <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight md:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-5 text-base leading-relaxed text-white/70 md:text-lg">
            {description}
          </p>
        )}
        {features.length > 0 && (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
