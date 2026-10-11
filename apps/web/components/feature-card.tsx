import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "cn";

export interface Feature {
  icon: IconSvgElement;
  title: string;
  description: string;
}

interface FeatureCardProps {
  feature: Feature;
  className?: string;
}

export function FeatureCard({ feature, className }: FeatureCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-3xl bg-white/20 p-4 backdrop-blur-sm",
        className,
      )}
    >
      <span className="grid size-11 place-items-center rounded-full bg-white text-brand-blue ring-1 ring-brand-blue/30">
        <HugeiconsIcon icon={feature.icon} size={20} strokeWidth={1.5} />
      </span>
      <p className="text-sm font-semibold">{feature.title}</p>
      <p className="text-center text-xs text-white/60">{feature.description}</p>
    </div>
  );
}
