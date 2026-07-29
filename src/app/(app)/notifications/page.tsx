import { AlertTriangle, Bell, Info, OctagonAlert } from "lucide-react";
import { getNotifications } from "@/lib/data";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

const ICON = { info: Info, warning: AlertTriangle, critical: OctagonAlert } as const;
const TONE = { info: "accent", warning: "warning", critical: "negative" } as const;

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <Card
      title="Notifications"
      subtitle="Derived live from your data — the same events that become push notifications on mobile"
    >
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Bell size={22} className="text-faint" aria-hidden />
          <p className="text-sm text-muted">All clear — nothing needs your attention right now.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {notifications.map((n) => {
            const Icon = ICON[n.severity];
            return (
              <li key={n.id} className="flex gap-3 py-3.5">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    n.severity === "critical"
                      ? "bg-negative/10 text-negative"
                      : n.severity === "warning"
                        ? "bg-warning/10 text-warning"
                        : "bg-accent-soft text-accent"
                  }`}
                >
                  <Icon size={15} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <Badge tone={TONE[n.severity]}>{n.kind.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{n.body}</p>
                </div>
                <time className="shrink-0 text-[11px] text-faint" dateTime={n.date.toISOString()}>
                  {n.date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
