"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Critical: "#ef4444",
  "Manual Review": "#8b5cf6",
};

interface Props {
  /** Risk distribution: { Low: count, Medium: count, ... } */
  distribution: Record<string, number>;
  /** Number of patients flagged for manual review */
  manualReviewCount?: number;
  /** Compact mode for embedding in sidebars */
  compact?: boolean;
}

export default function RiskHistogram({ distribution, manualReviewCount, compact = false }: Props) {
  const total = Object.values(distribution).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  const data = ["Low", "Medium", "High", "Critical"].map(level => ({
    name: level,
    count: distribution[level] || 0,
    pct: Math.round(((distribution[level] || 0) / total) * 100),
  }));

  // Add manual review bar if count provided
  if (manualReviewCount !== undefined && manualReviewCount > 0) {
    data.push({
      name: "Manual Review",
      count: manualReviewCount,
      pct: Math.round((manualReviewCount / total) * 100),
    });
  }

  const height = compact ? 110 : 150;

  return (
    <div className="section">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Risk Distribution
        </span>
        <span className="text-[9px] text-gray-400 font-mono ml-auto">{total} patients</span>
      </div>

      {/* Percentage badges */}
      <div className={`grid ${compact ? "grid-cols-5" : "grid-cols-5"} gap-1 mb-2`}>
        {data.map(d => (
          <div key={d.name} className="text-center">
            <div
              className="text-sm font-bold tabular-nums"
              style={{ color: RISK_COLORS[d.name] || "#94a3b8" }}
            >
              {d.pct}%
            </div>
            <div className="text-[8px] text-gray-400 uppercase">{d.name === "Manual Review" ? "Review" : d.name}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -10, right: 5, top: 5, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "#6B7280", fontSize: 9 }}
              tickFormatter={(v: string) => v === "Manual Review" ? "Review" : v}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#374151", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "0.375rem",
                fontSize: "11px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={((val: unknown, name?: string) => [`${Number(val)} patients`, name ?? ""]) as any}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={RISK_COLORS[d.name] || "#64748b"}
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
