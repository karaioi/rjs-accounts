"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "cn";
import { motion } from "motion/react";
import { SPRING_POP, SPRING_SOFT } from "@/components/motion/variants";

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
    <motion.div
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="pressed"
      variants={{
        rest: { y: 0, scale: 1 },
        hover: { y: -6, scale: 1.02 },
        pressed: { scale: 0.99 },
      }}
      transition={SPRING_SOFT}
      className={cn(
        "flex flex-col items-center gap-2 rounded-3xl bg-white/10 p-4 backdrop-blur-sm ring-1 ring-white/10 transition-colors hover:bg-white/15 hover:ring-white/20",
        className,
      )}
    >
      <motion.span
        variants={{
          rest: { scale: 1, rotate: 0 },
          hover: { scale: 1.12, rotate: -6 },
        }}
        transition={SPRING_POP}
        className="grid size-11 place-items-center rounded-full bg-white text-brand-blue ring-1 ring-brand-blue/30"
      >
        <HugeiconsIcon icon={feature.icon} size={20} strokeWidth={1.5} />
      </motion.span>
      <p className="text-sm font-semibold">{feature.title}</p>
      <p className="text-center text-xs text-white/60">{feature.description}</p>
    </motion.div>
  );
}
