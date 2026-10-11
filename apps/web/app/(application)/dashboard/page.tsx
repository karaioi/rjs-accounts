import { Notification03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Reveal } from "@/components/motion/reveal";

export default function DashboardPage() {
  return (
    <Reveal variant="fade-up">
      <HugeiconsIcon
        icon={Notification03Icon}
        size={24}
        color="currentColor"
        strokeWidth={1.5}
      />
    </Reveal>
  );
}
