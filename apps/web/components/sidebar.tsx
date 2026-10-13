"use client";

import {
  BankIcon,
  BookIcon,
  Building03Icon,
  CalculatorIcon,
  CashIcon,
  ChartIcon,
  ChevronDownIcon,
  DashboardSquare01Icon,
  DocumentCodeIcon,
  ListIcon,
  Money01Icon,
  Package01Icon,
  Receipt,
  ShoppingBag01Icon,
  ShoppingCart01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Collapse } from "@/components/motion/collapse";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SignOutButton } from "@/components/sign-out-button";

interface NavItem {
  href: string;
  label: string;
  icon: IconSvgElement;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: DashboardSquare01Icon,
  },
  {
    href: "/customers",
    label: "Customers",
    icon: Building03Icon,
  },
  {
    href: "/products",
    label: "Products",
    icon: Package01Icon,
  },
  {
    href: "/sales",
    label: "Sales",
    icon: ShoppingCart01Icon,
    children: [
      {
        href: "/sales/quotations",
        label: "Quotations",
        icon: DocumentCodeIcon,
      },
      { href: "/sales/invoices", label: "Invoices", icon: Receipt },
      {
        href: "/sales/payments-received",
        label: "Payments Received",
        icon: Money01Icon,
      },
    ],
  },
  {
    href: "/purchases",
    label: "Purchases",
    icon: ShoppingBag01Icon,
    children: [
      {
        href: "/purchases/purchase-orders",
        label: "Purchase Orders",
        icon: DocumentCodeIcon,
      },
      {
        href: "/purchases/purchase-bills",
        label: "Purchase Bills",
        icon: Receipt,
      },
      {
        href: "/purchases/payments-made",
        label: "Payments Made",
        icon: Money01Icon,
      },
    ],
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: Money01Icon,
  },
  {
    href: "/accounting",
    label: "Accounting",
    icon: CalculatorIcon,
    children: [
      { href: "/accounting/entries", label: "Entries", icon: ListIcon },
      {
        href: "/accounting/journal-entries",
        label: "Journal Entries",
        icon: BookIcon,
      },
    ],
  },
  {
    href: "/finance-banking",
    label: "Finance & Banking",
    icon: BankIcon,
    children: [
      {
        href: "/finance-banking/bank-accounts",
        label: "Bank Accounts",
        icon: BankIcon,
      },
      {
        href: "/finance-banking/cash-management",
        label: "Cash Management",
        icon: CashIcon,
      },
    ],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: ChartIcon,
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.children) {
    return item.children.some((child) => pathname.startsWith(child.href));
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function Sidebar({ isAdmin: _isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(label: string) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <Reveal variant="fade-in" className="sticky top-0 flex h-dvh shrink-0">
      {/* Left rail — icon bar */}
      <div className="flex w-16 flex-col items-center border-r border-white/10 bg-slate-900 py-4">
        <Link href="/dashboard" className="mb-4">
          <Image
            src="/logo.png"
            alt="rjs-accounts-logo"
            width={1039}
            height={1059}
            loading="eager"
            className="h-8 w-8 rounded-lg object-contain"
          />
        </Link>

        <button
          type="button"
          className="mb-4 grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="text-xl leading-none">+</span>
        </button>

        <div className="flex-1" />

        <div className="border-t border-white/10 pt-4">
          <SignOutButton variant="icon" />
        </div>
      </div>

      {/* Right panel — navigation */}
      <div className="flex w-64 flex-col border-r border-white/10 bg-slate-900">
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          <Stagger stagger={0.05}>
            {navItems.map((item) => {
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
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
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
                                  : "text-slate-400 hover:bg-white/5 hover:text-white"
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
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <HugeiconsIcon icon={Icon} size={18} strokeWidth={1.5} />
                    {item.label}
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </nav>
      </div>
    </Reveal>
  );
}
