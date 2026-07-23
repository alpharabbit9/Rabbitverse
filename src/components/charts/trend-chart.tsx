"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendPoint {
  label: string;
  value: number;
}

function ChartTooltip({ active, payload, suffix }: { active?: boolean; payload?: { payload: TrendPoint }[]; suffix?: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card-solid px-3 py-1.5 text-xs shadow-lg">
      <div className="text-fg-muted">{p.label}</div>
      <div className="font-semibold text-fg">
        {p.value}
        {suffix}
      </div>
    </div>
  );
}

export function TrendChart({
  data,
  color = "var(--accent-mint)",
  height = 240,
  suffix = "",
  domain,
  showGrid = true,
  showAxis = true,
}: {
  data: TrendPoint[];
  color?: string;
  height?: number;
  suffix?: string;
  domain?: [number | "auto", number | "auto"];
  showGrid?: boolean;
  showAxis?: boolean;
}) {
  const gid = `trend-${color.replace(/[^a-z]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 6, left: showAxis ? -18 : 6, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />}
        {showAxis && <XAxis dataKey="label" tick={{ fill: "var(--fg-muted)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />}
        {showAxis && <YAxis tick={{ fill: "var(--fg-muted)", fontSize: 11 }} axisLine={false} tickLine={false} domain={domain ?? ["auto", "auto"]} width={40} />}
        <Tooltip content={<ChartTooltip suffix={suffix} />} cursor={{ stroke: "var(--border-strong)" }} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#${gid})`} dot={false} activeDot={{ r: 4, fill: color }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
