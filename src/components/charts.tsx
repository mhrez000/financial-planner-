"use client";

/**
 * Chart components. All charts read the Sage CSS variables so they adapt to
 * light/dark automatically, and share one tooltip style.
 */

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const cssVar = (name: string) => `rgb(var(${name}))`;

const AXIS = { fontSize: 11, fill: "rgb(var(--faint))" };
const fmt$ = (v: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);

function SageTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="tabular-nums text-muted">
          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          {p.name}: {fmt$(p.value)}
        </p>
      ))}
    </div>
  );
}

export function CashflowChart({ data }: { data: { month: string; income: number; spending: number; saved: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barGap={3}>
        <CartesianGrid vertical={false} stroke="rgb(var(--border))" strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={38} />
        <Tooltip content={<SageTooltip />} cursor={{ fill: "rgb(var(--surface-2) / 0.6)" }} />
        <Bar dataKey="income" name="Income" fill={cssVar("--positive")} radius={[4, 4, 0, 0]} />
        <Bar dataKey="spending" name="Spending" fill={cssVar("--negative")} radius={[4, 4, 0, 0]} />
        <Bar dataKey="saved" name="Saved" fill={cssVar("--accent")} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data }: { data: { month: string; income: number; spending: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cssVar("--negative")} stopOpacity={0.25} />
            <stop offset="100%" stopColor={cssVar("--negative")} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgb(var(--border))" strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={38} />
        <Tooltip content={<SageTooltip />} />
        <Area type="monotone" dataKey="spending" name="Spending" stroke={cssVar("--negative")} strokeWidth={2} fill="url(#spendFill)" />
        <Area type="monotone" dataKey="income" name="Income" stroke={cssVar("--positive")} strokeWidth={2} fill="none" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLOURS = [
  "#2f855a", "#4f9d76", "#77b895", "#a3d0b7", "#c9a44a", "#b07a14",
  "#7a6db0", "#5a8fc0", "#c05a5d", "#8a9a90", "#5f6962", "#3d5a4c",
];

export function CategoryDonut({ data }: { data: { name: string; value: number }[] }) {
  const top = data.slice(0, 8);
  const rest = data.slice(8).reduce((a, d) => a + d.value, 0);
  const rows = rest > 0 ? [...top, { name: "Everything else", value: rest }] : top;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width={200} height={200}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={2} strokeWidth={0}>
            {rows.map((_, i) => (
              <Cell key={i} fill={DONUT_COLOURS[i % DONUT_COLOURS.length]} />
            ))}
          </Pie>
          <Tooltip content={<SageTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="grid flex-1 grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
        {rows.map((r, i) => (
          <li key={r.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DONUT_COLOURS[i % DONUT_COLOURS.length] }} />
            <span className="flex-1 truncate text-muted">{r.name}</span>
            <span className="font-medium tabular-nums">{fmt$(r.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeekdayBar({ data }: { data: { day: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip content={<SageTooltip />} cursor={{ fill: "rgb(var(--surface-2) / 0.6)" }} />
        <Bar dataKey="total" name="Spend" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.total === max ? cssVar("--warning") : cssVar("--accent")} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NetWorthChart({ data }: { data: { month: string; netWorth: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cssVar("--accent")} stopOpacity={0.3} />
            <stop offset="100%" stopColor={cssVar("--accent")} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgb(var(--border))" strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          width={44}
          domain={["dataMin - 20000", "dataMax + 20000"]}
        />
        <Tooltip content={<SageTooltip />} />
        <Area type="monotone" dataKey="netWorth" name="Net worth" stroke={cssVar("--accent")} strokeWidth={2.5} fill="url(#nwFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PayoffChart({
  data,
}: {
  data: { month: number; snowball: number | null; avalanche: number | null }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke="rgb(var(--border))" strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${Math.round(v / 12)}y`}
          interval={11}
        />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
        <Tooltip content={<SageTooltip />} labelFormatter={(v) => `Month ${v}`} />
        <Line type="monotone" dataKey="avalanche" name="Avalanche" stroke={cssVar("--accent")} strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="snowball" name="Snowball" stroke={cssVar("--warning")} strokeWidth={2} dot={false} strokeDasharray="6 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}
