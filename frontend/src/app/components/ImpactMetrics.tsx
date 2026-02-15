"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Users, Shield, Clock, ArrowDown, BarChart3 } from "lucide-react";
import { getImpactMetrics, ImpactMetrics as ImpactMetricsData } from "../lib/api";

function AnimCounter({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const from = prevRef.current;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (value - from) * eased;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
      else prevRef.current = value;
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span className="tabular-nums">{display.toFixed(decimals)}{suffix}</span>;
}

export default function ImpactMetricsPanel() {
  const [metrics, setMetrics] = useState<ImpactMetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getImpactMetrics()
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoading(false));
    const interval = setInterval(() => {
      getImpactMetrics().then(setMetrics).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">Optimization Impact</div>
        <div className="py-8 text-center text-gray-400 text-sm animate-pulse">Loading metrics...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="card">
        <div className="card-header">Optimization Impact</div>
        <div className="py-8 text-center text-gray-400 text-sm">No data yet — run simulation first</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>Optimization Impact</span>
        {metrics.is_precomputed && (
          <span className="text-[9px] text-amber-500 normal-case tracking-normal">estimated</span>
        )}
      </div>

      {/* Hero stat */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center py-4"
      >
        <div className="text-4xl font-black text-blue-600">
          <AnimCounter value={metrics.wait_time_improvement_pct} suffix="%" decimals={1} />
        </div>
        <div className="metric-label mt-1">Wait Time Reduction</div>
      </motion.div>

      {/* Before / After bars */}
      <div className="flex items-center gap-3 mb-4 px-2">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-gray-400 uppercase tracking-wider">Before (FIFO)</span>
            <span className="text-red-600 font-mono">{metrics.avg_wait_before_optimization.toFixed(1)}min</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500/70 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((metrics.avg_wait_before_optimization / 30) * 100, 100)}%` }}
            />
          </div>
        </div>
        <ArrowDown className="w-4 h-4 text-green-600 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-gray-400 uppercase tracking-wider">After (AI)</span>
            <span className="text-green-600 font-mono">{metrics.avg_wait_after_optimization.toFixed(1)}min</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500/70 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((metrics.avg_wait_after_optimization / 30) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-md p-2.5 text-center border border-gray-100">
          <Users className="w-4 h-4 text-blue-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900 tabular-nums">{metrics.patients_rerouted}</div>
          <div className="metric-label">Rerouted</div>
        </div>
        <div className="bg-gray-50 rounded-md p-2.5 text-center border border-gray-100">
          <Shield className="w-4 h-4 text-green-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900 tabular-nums">{metrics.overload_events_prevented}</div>
          <div className="metric-label">Overloads Prevented</div>
        </div>
        <div className="bg-gray-50 rounded-md p-2.5 text-center border border-gray-100">
          <BarChart3 className="w-4 h-4 text-blue-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900 tabular-nums">
          <AnimCounter value={metrics.throughput_improvement} suffix="%" decimals={0} />
          </div>
          <div className="metric-label">Throughput ↑</div>
        </div>
      </div>

      {/* Critical patient wait */}
      {metrics.critical_wait_optimized != null && (
        <div className="mt-3 flex items-center justify-between bg-red-50 border border-red-200 rounded-md p-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-red-600" />
            <span className="text-[11px] text-red-600">Critical patient avg wait</span>
          </div>
          <span className="text-sm font-bold text-red-600 tabular-nums">
            {metrics.critical_wait_optimized.toFixed(1)} min
          </span>
        </div>
      )}
    </div>
  );
}
