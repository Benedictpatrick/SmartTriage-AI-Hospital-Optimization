"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle, TrendingUp, Heart, Clock, Activity,
} from "lucide-react";

interface ForecastPoint {
  hour: number;
  label: string;
  arrivals: number;
  zone: "normal" | "elevated" | "surge";
}

interface ForecastAlert {
  severity: "red" | "yellow" | "blue";
  icon: React.ElementType;
  title: string;
  description: string;
}

function generateForecast(): ForecastPoint[] {
  const data: ForecastPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const hourRad = (h / 24) * 2 * Math.PI;
    let rate = 5;
    rate += 7 * Math.exp(-0.5 * Math.pow((h - 9) / 1.8, 2));
    rate += 5 * Math.exp(-0.5 * Math.pow((h - 15) / 2.0, 2));
    if (h >= 0 && h <= 5) {
      rate *= 0.35 + 0.15 * Math.sin(hourRad * 3);
    }
    const noise = Math.sin(h * 7.3 + 2.1) * 0.8 + Math.cos(h * 3.7 + 5.4) * 0.5;
    rate += noise;
    rate = Math.max(1, Math.round(rate * 10) / 10);

    let zone: ForecastPoint["zone"] = "normal";
    if (rate >= 10) zone = "surge";
    else if (rate >= 7) zone = "elevated";

    data.push({ hour: h, label: `${h.toString().padStart(2, "0")}:00`, arrivals: rate, zone });
  }
  return data;
}

const ALERTS: ForecastAlert[] = [
  {
    severity: "red",
    icon: AlertTriangle,
    title: "Surge predicted at 14:00 – 16:00",
    description: "Prepare additional staffing and open overflow bay C.",
  },
  {
    severity: "yellow",
    icon: Heart,
    title: "Cardiac cluster probability: 23%",
    description: "Elevated likelihood in next 2 hours based on historical patterns.",
  },
  {
    severity: "blue",
    icon: TrendingUp,
    title: "Current trend: +12% above baseline",
    description: "Arrivals are running above the 30-day average for this time window.",
  },
];

const severityConfig = {
  red: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.20)", text: "#f87171", dot: "#ef4444" },
  yellow: { bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.20)", text: "#facc15", dot: "#eab308" },
  blue: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.20)", text: "#60a5fa", dot: "#3b82f6" },
};

function CustomTooltip({ active, payload, label }: { active?: unknown; payload?: unknown; label?: unknown }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  const entry = payload[0] as { value?: number; payload?: ForecastPoint };
  const point = entry.payload;
  if (!point) return null;

  const zoneColors = { normal: "#22c55e", elevated: "#eab308", surge: "#ef4444" };

  return (
    <div className="rounded-lg px-3 py-2 text-[11px] border shadow-lg"
      style={{ background: "#FFFFFF", borderColor: "#E5E7EB" }}>
      <p className="text-gray-500 mb-1">{String(label)}</p>
      <p className="text-gray-900 font-semibold">{point.arrivals} patients/hr</p>
      <p className="text-[10px] font-medium mt-0.5 uppercase tracking-wider"
        style={{ color: zoneColors[point.zone] }}>
        {point.zone}
      </p>
    </div>
  );
}

export default function SurgeForecaster() {
  const [data, setData] = useState<ForecastPoint[]>([]);
  const [currentHour, setCurrentHour] = useState(0);

  useEffect(() => {
    setData(generateForecast());
    setCurrentHour(new Date().getHours());
  }, []);

  const peakRate = useMemo(
    () => (data.length > 0 ? Math.max(...data.map((d) => d.arrivals)) : 15),
    [data]
  );

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border p-4"
      style={{ background: "var(--card-bg, #FFFFFF)", borderColor: "var(--card-border, #E5E7EB)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(6,182,212,0.10)" }}>
            <Activity className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-900 tracking-tight leading-none">Predictive Surge Forecast</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">24-hour patient arrival prediction</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-400">Normal</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-gray-400">Elevated</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-400">Surge</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="surgeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="60%" stopColor="#06b6d4" stopOpacity={0.10} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#6B7280" }}
              axisLine={{ stroke: "#E5E7EB" }}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
              domain={[0, Math.ceil(peakRate + 2)]}
              label={{ value: "pts/hr", angle: -90, position: "insideLeft", offset: 24, style: { fontSize: 9, fill: "#475569" } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={10} stroke="rgba(239,68,68,0.20)" strokeDasharray="4 4"
              label={{ value: "Surge", position: "right", style: { fontSize: 9, fill: "#ef4444" } }}
            />
            <ReferenceLine y={7} stroke="rgba(234,179,8,0.15)" strokeDasharray="4 4"
              label={{ value: "Elevated", position: "right", style: { fontSize: 9, fill: "#eab308" } }}
            />
            <ReferenceLine
              x={`${currentHour.toString().padStart(2, "0")}:00`}
              stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 4"
              label={{ value: "NOW", position: "top", style: { fontSize: 9, fill: "#06b6d4", fontWeight: 700 } }}
            />
            <Area
              type="monotone" dataKey="arrivals"
              stroke="#3b82f6" strokeWidth={2} fill="url(#surgeFill)"
              dot={false}
              activeDot={{ r: 4, stroke: "#3b82f6", strokeWidth: 2, fill: "#FFFFFF" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast Alerts */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Forecast Alerts</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {ALERTS.map((alert) => {
            const cfg = severityConfig[alert.severity];
            const Icon = alert.icon;
            return (
              <div key={alert.title} className="rounded-lg p-3 border" style={{ background: cfg.bg, borderColor: cfg.border }}>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    <Icon className="w-3.5 h-3.5" style={{ color: cfg.text }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold leading-tight" style={{ color: cfg.text }}>{alert.title}</p>
                    <p className="text-[10px] text-gray-400 mt-1 leading-snug">{alert.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
