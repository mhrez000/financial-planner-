import Link from "next/link";
import { Bell } from "lucide-react";
import { Sidebar } from "@/components/shell/Sidebar";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { getNotifications, getSessionUser } from "@/lib/data";
import { logoutAction } from "@/lib/authActions";

/**
 * Authenticated shell. `getSessionUser` redirects to /login when there is no
 * valid session, so every page inside this group is protected — and every
 * data function re-checks the session itself (defence in depth).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const urgentCount = await getNotifications()
    .then((n) => n.filter((x) => x.severity !== "info").length)
    .catch(() => 0);
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/85 px-4 py-3 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs text-faint">
              {new Date().toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <p className="text-sm font-semibold">G&rsquo;day, {firstName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              aria-label={`Notifications${urgentCount > 0 ? ` — ${urgentCount} need attention` : ""}`}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-colors hover:text-ink"
            >
              <Bell size={16} aria-hidden />
              {urgentCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-negative px-1 text-[9px] font-bold text-white">
                  {urgentCount}
                </span>
              )}
            </Link>
            <ThemeToggle />
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-8 lg:pb-8">
          {children}
        </main>
      </div>
    </>
  );
}
