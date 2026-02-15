"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, AlertTriangle, Clock, Building2, Activity, Gauge,
} from "lucide-react";

interface Props {
  queueSize: number;
  highRiskCount: number;
  overloadedDepts: number;
  avgWaitTime: number;
  apiStatus: "checking" | "online" | "offline";
}

function AnimNum({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ y: -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="text-base font-extrabold text-gray-900 tabular-nums tracking-tight"
    >
      {value}{suffix}
    </motion.span>
  );
}

export default function StatusBar({ queueSize, highRiskCount, overloadedDepts, avgWaitTime, apiStatus }: Props) {
  const [time, setTime] = useState("");
  const [capacityPct] = useState(() => Math.round(45 + Math.random() * 25));

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const cells: { label: string; value: number; icon: typeof Users; color: string; suffix?: string }[] = [
    { label: "Live Patients", value: queueSize, icon: Users, color: queueSize > 20 ? "#eab308" : "#06b6d4" },
    { label: "Critical", value: highRiskCount, icon: AlertTriangle, color: highRiskCount > 5 ? "#ef4444" : "#f97316" },
    { label: "Overloaded", value: overloadedDepts, icon: Building2, color: overloadedDepts > 0 ? "#ef4444" : "#22c55e" },
    { label: "Avg Wait", value: avgWaitTime, icon: Clock, color: avgWaitTime > 15 ? "#eab308" : "#22c55e", suffix: "m" },
    { label: "Capacity", value: capacityPct, icon: Gauge, color: capacityPct > 80 ? "#ef4444" : capacityPct > 60 ? "#eab308" : "#22c55e", suffix: "%" },
  ];

  return (
    <div className="glass border-b border-gray-200 px-3 py-1">
      <div className="max-w-[1800px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 mr-1">
            <Activity className="w-3 h-3 text-cyan-500" />
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">System Status</span>
          </div>
          {cells.map(({ label, value, icon: Icon, color, suffix }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="w-3 h-3" style={{ color, opacity: 0.7 }} />
              <div className="flex flex-col leading-none">
                <span className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
                <AnimNum value={value} suffix={suffix} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`status-dot ${
              apiStatus === "online" ? "status-online" :
              apiStatus === "offline" ? "status-offline" : "status-checking"
            }`} />
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
              {apiStatus === "online" ? "Online" : apiStatus === "offline" ? "Offline" : "..."}
            </span>
          </div>
          <div className="font-mono text-xs text-gray-400 tabular-nums tracking-tight">
            {time}
          </div>
        </div>
      </div>
    </div>
  );
}
