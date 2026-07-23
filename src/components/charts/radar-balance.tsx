"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

export interface BalancePoint {
  axis: string;
  you: number;
  ideal: number;
}

export function RadarBalance({ data, height = 240 }: { data: BalancePoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--fg-muted)", fontSize: 11 }} />
        <Radar name="Ideal" dataKey="ideal" stroke="var(--fg-muted)" strokeDasharray="4 4" fill="none" />
        <Radar name="You" dataKey="you" stroke="var(--accent-purple)" strokeWidth={2} fill="var(--accent-purple)" fillOpacity={0.28} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
