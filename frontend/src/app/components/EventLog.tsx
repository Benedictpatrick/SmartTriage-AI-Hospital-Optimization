"use client";

import { useState, useEffect, useCallback } from "react";
import { EventEntry, getRecentEvents } from "../lib/api";
import { Radio, AlertTriangle, Shield, ArrowRightLeft, Cpu, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EVENT_ICONS: Record<string, typeof Radio> = {
  triage: Shield,
  escalation: AlertTriangle,
  reroute: ArrowRightLeft,
  alert: AlertTriangle,
  system: Cpu,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "#06b6d4",
  warning: "#eab308",
  critical: "#ef4444",
};

export default function EventLog() {
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchEvents = useCallback(async () => {
    try {
      const { events: recent, total: t } = await getRecentEvents(30);
      setEvents(recent);
      setTotal(t);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 3000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="section">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-blue-600" />
          <span className="section-title">Event Log</span>
          <span className="text-[10px] text-gray-400 font-mono">{total} events</span>
          {events.some(e => e.severity === "critical") && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="max-h-[260px] overflow-y-auto space-y-0.5 scrollbar-thin">
              {events.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No events yet — submit a triage or start a simulation</p>
              ) : (
                events.map((event, i) => {
                  const Icon = EVENT_ICONS[event.event_type] || Cpu;
                  const color = SEVERITY_COLORS[event.severity] || "#64748b";
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        <Icon className="w-3 h-3" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-gray-700 leading-tight truncate">
                          {event.message}
                        </p>
                      </div>
                      <span className="text-[9px] text-gray-400 font-mono flex-shrink-0 mt-0.5">
                        {formatTime(event.timestamp)}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
