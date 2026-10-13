import {
  AnalysisTextLinkIcon,
  AnalyticsUpIcon,
  BadgeIndianRupeeIcon,
  BankIcon,
  Book03Icon,
  Building03Icon,
  CalculateIcon,
  DashboardCircleIcon,
  DocumentCodeIcon,
  ListIcon,
  Package01Icon,
  Receipt,
  ShoppingBag01Icon,
  TrendingUpIcon,
  UserIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export interface NavItem {
  href: string;
  label: string;
  icon: IconSvgElement;
  children?: NavItem[];
  badge?: number;
}

export interface SidebarUser {
  name: string | null;
  email: string | null;
  organization: string | null;
  role: string | null;
  accountStatus: string | null;
}

export interface SidebarProps {
  isAdmin?: boolean;
  user?: SidebarUser;
}

export const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: DashboardCircleIcon,
  },
  {
    href: "/customers",
    label: "Customers",
    icon: UserIcon,
  },
  {
    href: "/products",
    label: "Products",
    icon: Package01Icon,
  },
  {
    href: "/sales",
    label: "Sales",
    icon: AnalyticsUpIcon,
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
        icon: TrendingUpIcon,
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
        icon: TrendingUpIcon,
      },
    ],
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: BadgeIndianRupeeIcon,
  },
  {
    href: "/accounting",
    label: "Accounting",
    icon: CalculateIcon,
    children: [
      { href: "/accounting/entries", label: "Entries", icon: ListIcon },
      {
        href: "/accounting/journal-entries",
        label: "Journal Entries",
        icon: Book03Icon,
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
        icon: Wallet01Icon,
      },
    ],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: AnalysisTextLinkIcon,
  },
];

export const adminNavItem: NavItem = {
  href: "/admin/organizations",
  label: "Organizations",
  icon: Building03Icon,
};

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.children) {
    return item.children.some((child) => pathname.startsWith(child.href));
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getNavigationItems(isAdmin?: boolean): NavItem[] {
  if (!isAdmin) {
    return navItems;
  }
  const first = navItems[0];
  return [...(first ? [first] : []), adminNavItem, ...navItems.slice(1)];
}
