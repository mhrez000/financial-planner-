"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BarChart3,
  Bell,
  CalendarClock,
  CandlestickChart,
  CreditCard,
  FileText,
  Flame,
  Import,
  Landmark,
  LayoutDashboard,
  Leaf,
  LineChart,
  PiggyBank,
  Repeat,
  Settings,
  Target,
  Wallet,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Wallet },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/insights", label: "Analytics", icon: BarChart3 },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/bills", label: "Bills", icon: CalendarClock },
  { href: "/net-worth", label: "Net Worth", icon: LineChart },
  { href: "/investments", label: "Investments", icon: CandlestickChart },
  { href: "/debts", label: "Debt Planner", icon: CreditCard },
  { href: "/habits", label: "Habits", icon: Flame },
];

const TOOLS = [
  { href: "/import", label: "Import & Sync", icon: Import },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/tax", label: "Tax Centre", icon: Landmark },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-border bg-surface px-3 py-5 lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-white">
            <Leaf size={17} strokeWidth={2.4} aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">Sage</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Primary">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <Icon size={17} strokeWidth={2.2} aria-hidden />
                {label}
              </Link>
            );
          })}
          <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-faint">
            Tools
          </p>
          {TOOLS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <Icon size={17} strokeWidth={2.2} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <p className="px-3 text-[11px] leading-relaxed text-faint">
          Demo data · AUD
          <br />
          Privacy-first: your data stays yours.
        </p>
      </aside>

      {/* Mobile bottom tab bar (first five destinations) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface/95 backdrop-blur lg:hidden"
        aria-label="Primary"
      >
        {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                active ? "text-accent" : "text-muted",
              )}
            >
              <Icon size={19} strokeWidth={2.2} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
