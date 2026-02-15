"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Building2, Globe, Activity, Users, AlertTriangle,
  Wifi, WifiOff, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

/* ── Types ─────────────────────────────────────────────── */

interface HospitalNode {
  id: string;
  name: string;
  city: string;
  beds: number;
  occupancy: number;
  aiEnabled: boolean;
  criticalPatients: number;
  avgWait: number;
  throughput: number;
  status: "online" | "degraded" | "offline";
}

const HOSPITALS: HospitalNode[] = [
  { id: "main", name: "MedBrain Central", city: "San Francisco", beds: 450, occupancy: 72, aiEnabled: true, criticalPatients: 8, avgWait: 12, throughput: 34, status: "online" },
  { id: "east", name: "MedBrain East", city: "New York", beds: 620, occupancy: 85, aiEnabled: true, criticalPatients: 14, avgWait: 18, throughput: 48, status: "online" },
  { id: "south", name: "MedBrain South", city: "Houston", beds: 380, occupancy: 61, aiEnabled: false, criticalPatients: 5, avgWait: 24, throughput: 22, status: "degraded" },
];

/* ── Component ─────────────────────────────────────────── */

export default function MultiHospitalView() {
  const [nodes, setNodes] = useState(HOSPITALS);
  const [selected, setSelected] = useState<string | null>(null);

  // Simulate live fluctuation
  useEffect(() => {
    const iv = setInterval(() => {
      setNodes(prev => prev.map(h => ({
        ...h,
        occupancy: Math.max(30, Math.min(98, h.occupancy + (Math.random() - 0.5) * 4)),
        criticalPatients: Math.max(0, h.criticalPatients + (Math.random() > 0.7 ? 1 : Math.random() < 0.3 ? -1 : 0)),
        avgWait: Math.max(5, Math.round(h.avgWait + (Math.random() - 0.5) * 3)),
        throughput: Math.max(10, Math.round(h.throughput + (Math.random() - 0.5) * 4)),
      })));
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  const aggregate = useMemo(() => ({
    totalBeds: nodes.reduce((a, n) => a + n.beds, 0),
    avgOccupancy: Math.round(nodes.reduce((a, n) => a + n.occupancy, 0) / nodes.length),
    totalCritical: nodes.reduce((a, n) => a + n.criticalPatients, 0),
    totalThroughput: nodes.reduce((a, n) => a + n.throughput, 0),
    aiCoverage: Math.round((nodes.filter(n => n.aiEnabled).length / nodes.length) * 100),
    onlineCount: nodes.filter(n => n.status === "online").length,
  }), [nodes]);

  return (
    <div className="section">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Multi-Site Network
          </span>
          <span className={`px-1.5 py-0.5 text-[7px] font-bold rounded-full ${aggregate.onlineCount === nodes.length ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {aggregate.onlineCount}/{nodes.length} Online
          </span>
        </div>
      </div>

      {/* Aggregate strip */}
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {[
          { label: "Total Beds", value: aggregate.totalBeds.toLocaleString(), icon: Building2, color: "text-blue-600" },
          { label: "Avg Occupancy", value: `${aggregate.avgOccupancy}%`, icon: Activity, color: aggregate.avgOccupancy > 80 ? "text-red-600" : "text-green-600" },
          { label: "Critical", value: aggregate.totalCritical.toString(), icon: AlertTriangle, color: "text-red-600" },
          { label: "Throughput", value: `${aggregate.totalThroughput}/hr`, icon: Users, color: "text-purple-600" },
          { label: "AI Coverage", value: `${aggregate.aiCoverage}%`, icon: Activity, color: "text-blue-600" },
        ].map(s => (
          <div key={s.label} className="p-2 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <s.icon className={`w-3 h-3 mx-auto mb-0.5 ${s.color}`} />
            <div className={`text-xs font-black font-mono ${s.color}`}>{s.value}</div>
            <div className="text-[7px] text-gray-400 uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Hospital cards */}
      <div className="space-y-1.5">
        {nodes.map(h => {
          const isSelected = selected === h.id;
          const occColor = h.occupancy > 85 ? "bg-red-500" : h.occupancy > 70 ? "bg-amber-500" : "bg-green-500";
          const statusIcon = h.status === "online" ? <Wifi className="w-2.5 h-2.5 text-green-500" />
            : h.status === "degraded" ? <Wifi className="w-2.5 h-2.5 text-amber-500" />
            : <WifiOff className="w-2.5 h-2.5 text-red-500" />;

          return (
            <motion.button
              key={h.id}
              onClick={() => setSelected(isSelected ? null : h.id)}
              className={`w-full text-left p-2.5 rounded-lg border transition ${
                isSelected
                  ? "bg-blue-50 border-blue-300 shadow-sm"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
              layout
            >
              <div className="flex items-center gap-2">
                {statusIcon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-800 truncate">{h.name}</span>
                    {h.aiEnabled && (
                      <span className="px-1 py-0 text-[7px] font-bold bg-blue-100 text-blue-700 rounded">AI</span>
                    )}
                  </div>
                  <div className="text-[8px] text-gray-400">{h.city} · {h.beds} beds</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className={`text-[10px] font-black font-mono ${h.occupancy > 85 ? "text-red-600" : h.occupancy > 70 ? "text-amber-600" : "text-green-600"}`}>
                      {Math.round(h.occupancy)}%
                    </div>
                    <div className="w-12 h-1 bg-gray-200 rounded-full mt-0.5">
                      <div className={`h-full rounded-full ${occColor} transition-all duration-500`} style={{ width: `${h.occupancy}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black font-mono text-gray-700">{h.avgWait}m</div>
                    <div className="text-[7px] text-gray-400">Wait</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black font-mono text-red-600">{h.criticalPatients}</div>
                    <div className="text-[7px] text-gray-400">Crit</div>
                  </div>
                  <ChevronRight className={`w-3 h-3 text-gray-300 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                </div>
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-4 gap-2"
                >
                  {[
                    { value: `${h.throughput}/hr`, label: "Throughput", color: "text-gray-800" },
                    { value: Math.round(h.beds * h.occupancy / 100).toString(), label: "Active", color: "text-gray-800" },
                    { value: (h.beds - Math.round(h.beds * h.occupancy / 100)).toString(), label: "Available", color: "text-green-600" },
                    { value: h.status, label: "Status", color: h.status === "online" ? "text-green-600" : "text-amber-600" },
                  ].map(d => (
                    <div key={d.label} className="p-1.5 bg-gray-50 rounded text-center">
                      <div className={`text-[10px] font-black font-mono ${d.color}`}>{d.value}</div>
                      <div className="text-[7px] text-gray-400">{d.label}</div>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
