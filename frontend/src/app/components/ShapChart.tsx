"use client";

import { ShapFeature } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Brain } from "lucide-react";

interface Props {
  features: ShapFeature[];
  explanationText: string;
}

export default function ShapChart({ features, explanationText }: Props) {
  if (!features.length) {
    return (
      <div className="card flex items-center justify-center min-h-[200px] text-gray-400 text-sm">
        No explanation available
      </div>
    );
  }

  const data = features.slice(0, 7).map((f) => ({
    name: f.feature.replace("kw_", "").replace(/_/g, " "),
    value: Math.round(f.contribution * 1000) / 1000,
    abs: Math.abs(f.contribution),
  })).sort((a, b) => b.abs - a.abs);

  return (
    <div className="card">
      <div className="card-header flex items-center gap-2 mb-2">
        <Brain className="w-3.5 h-3.5 text-purple-400" />
        <span>Explainability (SHAP)</span>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
            <XAxis type="number" tick={{ fill: "#6B7280", fontSize: 11 }} />
            <YAxis
              dataKey="name" type="category"
              tick={{ fill: "#374151", fontSize: 11 }}
              width={75}
            />
            <Tooltip
              contentStyle={{
                background: "#FFFFFF", border: "1px solid #E5E7EB",
                borderRadius: "0.5rem", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.value > 0 ? "#ef4444" : "#3b82f6"}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 bg-gray-50 rounded-lg p-2">
        <pre className="text-[10px] text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
          {explanationText}
        </pre>
      </div>
    </div>
  );
}
