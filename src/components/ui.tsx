/**
 * Sage UI primitives — the small shared vocabulary every screen is built from.
 */
import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
        className,
      )}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-faint">{label}</p>
      <p
        className={clsx(
          "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ProgressBar({
  fraction,
  tone = "accent",
  className,
}: {
  fraction: number;
  tone?: "accent" | "warning" | "negative";
  className?: string;
}) {
  const width = Math.min(100, Math.max(0, fraction * 100));
  return (
    <div
      className={clsx("h-2 overflow-hidden rounded-full bg-surface-2", className)}
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={clsx(
          "h-full rounded-full transition-all duration-500",
          tone === "accent" && "bg-accent",
          tone === "warning" && "bg-warning",
          tone === "negative" && "bg-negative",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "negative" | "warning" | "accent";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "neutral" && "bg-surface-2 text-muted",
        tone === "positive" && "bg-positive/10 text-positive",
        tone === "negative" && "bg-negative/10 text-negative",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "accent" && "bg-accent-soft text-accent",
      )}
    >
      {children}
    </span>
  );
}

/** Animated circular gauge used for the Financial Health Score. */
export function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const r = (size - 14) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Financial health score ${score} out of 100`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={10}
        className="stroke-surface-2"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="stroke-[rgb(var(--accent))] transition-all duration-700"
      />
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-[rgb(var(--ink))] text-3xl font-bold tabular-nums"
      >
        {score}
      </text>
      <text
        x="50%"
        y="64%"
        textAnchor="middle"
        className="fill-[rgb(var(--faint))] text-[10px] font-medium uppercase tracking-wide"
      >
        / 100
      </text>
    </svg>
  );
}
