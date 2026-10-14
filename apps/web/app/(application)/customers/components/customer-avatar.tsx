import { cn } from "cn";
import { CUSTOMER_AVATAR_COLORS } from "@/lib/data/customers";

export function getAvatarColor(idOrName: string): string {
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = idOrName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CUSTOMER_AVATAR_COLORS.length;
  return CUSTOMER_AVATAR_COLORS[index] ?? "bg-[#c2410c] text-white";
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "CU";
}

interface CustomerAvatarProps {
  name: string;
  className?: string;
}

export function CustomerAvatar({ name, className }: CustomerAvatarProps) {
  const initials = getInitials(name);
  const color = getAvatarColor(name);

  return (
    <div
      className={cn(
        "size-10 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-xs",
        color,
        className,
      )}
    >
      {initials}
    </div>
  );
}

interface CustomerStatusBadgeProps {
  status?: string;
  hasDot?: boolean;
  className?: string;
}

export function CustomerStatusBadge({
  status = "Active",
  hasDot = false,
  className,
}: CustomerStatusBadgeProps) {
  return (
    <span
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 font-semibold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full border bg-brand-green/10 text-brand-green border-brand-green/20 shadow-xs",
        className,
      )}
    >
      {hasDot && (
        <span className="size-1.5 rounded-full bg-brand-green shrink-0" />
      )}
      {status}
    </span>
  );
}
