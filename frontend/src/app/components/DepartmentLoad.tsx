"use client";

import { DepartmentStatus } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Building2 } from "lucide-react";

interface Props {
  departments: DepartmentStatus[];
}

export default function DepartmentLoad({ departments }: Props) {
  if (!departments.length) {
    return (
      <div className="card text-gray-400 text-sm text-center py-8">
        No department data available
      </div>
    );
  }

  const data = departments.map((d) => ({
    name: d.name.length > 12 ? d.name.slice(0, 11) + "…" : d.name,
    fullName: d.name,
    occupancy: d.occupancy_pct,
    load: d.current_load,
    capacity: d.capacity,
    overloaded: d.is_overloaded,
  }));

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-900">Department Load</h2>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 90, right: 20 }}>
            <XAxis
              type="number" domain={[0, 100]}
              tick={{ fill: "#6B7280", fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              dataKey="name" type="category"
              tick={{ fill: "#374151", fontSize: 11 }}
              width={85}
            />
            <Tooltip
              contentStyle={{
                background: "#FFFFFF", border: "1px solid #E5E7EB",
                borderRadius: "0.5rem", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, _name: any, props: any) => [
                `${Number(value).toFixed(1)}% (${props.payload.load}/${props.payload.capacity})`,
                props.payload.fullName,
              ]}
            />
            <ReferenceLine x={85} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Bar dataKey="occupancy" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.occupancy >= 85 ? "#ef4444" :
                    entry.occupancy >= 60 ? "#eab308" : "#22c55e"
                  }
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" /> &lt;60%
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" /> 60-85%
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" /> &gt;85% overloaded
        </span>
      </div>
    </div>
  );
}
