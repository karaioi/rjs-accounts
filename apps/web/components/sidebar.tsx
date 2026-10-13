"use client";

import {
  ChevronDownIcon,
  Search01Icon,
  UnfoldMoreDownIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Collapse } from "@/components/motion/collapse";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SignOutButton } from "@/components/sign-out-button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  getNavigationItems,
  isActive,
  type SidebarProps,
} from "@/lib/data/navigation";

export function Sidebar({ isAdmin = false, user }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Admin: pathname.startsWith("/admin"),
  });

  function toggle(label: string) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  const items = getNavigationItems(isAdmin);

  return (
    <Reveal variant="fade-in" className="sticky top-0 flex h-dvh shrink-0 p-2">
      <div className="flex w-72 flex-col rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header — logo + search */}
        <div className="flex items-center justify-between p-4">
          <Link href="/dashboard">
            <Image
              src="/login-logo.png"
              alt="rjs-accounts-logo"
              width={1039}
              height={1059}
              loading="eager"
              className="w-20 rounded-lg object-contain"
            />
          </Link>
          <Button
            type="button"
            className="bg-white text-black size-8 rounded-full hover:bg-white"
            aria-label="Search"
          >
            <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-4 pb-4">
          <Stagger stagger={0.05}>
            {items.map((item) => {
              const active = isActive(pathname, item);
              const isExpanded = expanded[item.label] ?? false;
              const Icon = item.icon;

              if (item.children) {
                return (
                  <StaggerItem key={item.href}>
                    <button
                      type="button"
                      onClick={() => toggle(item.label)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-white/10 text-white"
                          : "text-slate-100 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <HugeiconsIcon icon={Icon} size={18} strokeWidth={1.5} />
                      <span className="flex-1 text-left">{item.label}</span>
                      <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="grid place-items-center"
                      >
                        <HugeiconsIcon
                          icon={ChevronDownIcon}
                          size={16}
                          strokeWidth={1.5}
                        />
                      </motion.span>
                    </button>
                    <Collapse show={isExpanded}>
                      <div className="ml-6 flex flex-col gap-0.5 border-l border-white/10 py-1 pl-3">
                        {item.children.map((child) => {
                          const childActive =
                            pathname === child.href ||
                            pathname.startsWith(`${child.href}/`);
                          const ChildIcon = child.icon;

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                                childActive
                                  ? "bg-white/10 font-medium text-white"
                                  : "text-slate-100 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              <HugeiconsIcon
                                icon={ChildIcon}
                                size={16}
                                strokeWidth={1.5}
                              />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    </Collapse>
                  </StaggerItem>
                );
              }

              return (
                <StaggerItem key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-slate-100 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <HugeiconsIcon icon={Icon} size={18} strokeWidth={1.5} />
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto rounded-full bg-brand-blue px-2 py-0.5 text-xs font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </nav>

        {/* User info + sign out at bottom */}
        {user && (
          <div className="border-t border-white/10 p-4">
            <Popover>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl p-1 transition-colors hover:bg-white/5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-blue text-sm font-bold text-white">
                      {user.name?.charAt(0)?.toUpperCase() ||
                        user.email?.charAt(0)?.toUpperCase() ||
                        "U"}
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium text-white">
                        {user.name || "Unnamed user"}
                      </p>
                      <p className="truncate text-xs font-semibold tracking-wider text-slate-400 uppercase">
                        {user.role || "User"}
                      </p>
                    </div>
                    <HugeiconsIcon
                      icon={UnfoldMoreDownIcon}
                      size={18}
                      strokeWidth={1.5}
                      className="shrink-0 text-slate-400"
                    />
                  </button>
                }
              />
              <PopoverPopup className="w-64">
                <div className="mb-3">
                  <p className="text-base font-semibold text-slate-900">
                    {user.name || "Unnamed user"}
                  </p>
                  <p
                    className="truncate text-sm text-slate-500"
                    title={user.email ?? undefined}
                  >
                    {user.email || "No email"}
                  </p>
                </div>
                <div className="mb-3 space-y-1.5 border-t border-black/10 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Role</span>
                    <span className="text-xs font-semibold tracking-wider text-slate-900 uppercase">
                      {user.role || "User"}
                    </span>
                  </div>
                  {user.organization && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Organization
                      </span>
                      <span className="truncate text-xs font-medium text-slate-900">
                        {user.organization}
                      </span>
                    </div>
                  )}
                  {user.accountStatus && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Status</span>
                      <span className="text-xs font-medium text-slate-900">
                        {user.accountStatus}
                      </span>
                    </div>
                  )}
                </div>
                <SignOutButton variant="popover" />
              </PopoverPopup>
            </Popover>
          </div>
        )}
      </div>
    </Reveal>
  );
}
