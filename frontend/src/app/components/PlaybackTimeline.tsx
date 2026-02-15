"use client";

import { useState } from "react";
import { StateSnapshot } from "../lib/api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Area, AreaChart, ReferenceLine,
} from "recharts";
import { Play, SkipBack, SkipForward, Clock } from "lucide-react";

interface Props {
  history: StateSnapshot[];
}

export default function PlaybackTimeline({ history }: Props) {
  const [selectedTick, setSelectedTick] = useState<number | null>(null);

  if (!history || history.length < 3) return null;

  const maxTick = history[history.length - 1].tick;

  // Find notable events
  const peakFifoQueue = history.reduce((max, s) => s.fifo_queue_depth > max.fifo_queue_depth ? s : max, history[0]);
  const firstReroute = history.find(s => s.rerouted_total > 0);

  // Selected snapshot data
  const selectedSnapshot = selectedTick !== null
    ? history.find(s => s.tick === selectedTick) || null
    : null;

  return (
    <div className="section space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Scenario Playback Timeline
        </span>
        <span className="text-[9px] text-gray-400 font-mono ml-auto">{history.length} ticks</span>
      </div>

      {/* ── Queue Depth Comparison (AI vs FIFO) ──── */}
      <div>
        <div className="text-[9px] text-gray-400 mb-1">Queue Depth Over Time</div>
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ left: -10, right: 5, top: 5, bottom: 0 }}>
              <XAxis
                dataKey="tick"
                tick={{ fill: "#64748b", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "0.375rem",
                  fontSize: "10px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                labelFormatter={(v) => `Tick ${v}`}
              />
              <Line
                type="monotone"
                dataKey="fifo_queue_depth"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="FIFO Queue"
                strokeOpacity={0.8}
              />
              <Line
                type="monotone"
                dataKey="ai_queue_depth"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                name="AI Queue"
                strokeOpacity={0.8}
              />
              {/* Notable markers */}
              {peakFifoQueue && (
                <ReferenceLine
                  x={peakFifoQueue.tick}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeOpacity={0.4}
                />
              )}
              {firstReroute && (
                <ReferenceLine
                  x={firstReroute.tick}
                  stroke="#06b6d4"
                  strokeDasharray="3 3"
                  strokeOpacity={0.4}
                />
              )}
              {selectedTick !== null && (
                <ReferenceLine
                  x={selectedTick}
                  stroke="#2563EB"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-1 text-[8px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 rounded" /> FIFO Queue</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-500 rounded" /> AI Queue</span>
          {peakFifoQueue && <span className="ml-auto">Peak FIFO: tick {peakFifoQueue.tick} ({peakFifoQueue.fifo_queue_depth} pts)</span>}
        </div>
      </div>

      {/* ── Wait Time Comparison ────────────────── */}
      <div>
        <div className="text-[9px] text-gray-400 mb-1">Average Wait Time Trend</div>
        <div className="h-[110px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ left: -10, right: 5, top: 5, bottom: 0 }}>
              <XAxis
                dataKey="tick"
                tick={{ fill: "#64748b", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}s`}
              />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "0.375rem",
                  fontSize: "10px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                labelFormatter={(v) => `Tick ${v}`}
                formatter={(v: unknown) => [`${Number(v).toFixed(1)}s`]}
              />
              <Area
                type="monotone"
                dataKey="fifo_avg_wait"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.08}
                strokeWidth={1.5}
                name="FIFO Wait"
              />
              <Area
                type="monotone"
                dataKey="ai_avg_wait"
                stroke="#06b6d4"
                fill="#06b6d4"
                fillOpacity={0.08}
                strokeWidth={1.5}
                name="AI Wait"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Scrub Slider ───────────────────────────── */}
      <div className="bg-gray-50 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 mb-1.5">
          <button
            onClick={() => setSelectedTick(history[0]?.tick ?? 0)}
            className="text-gray-400 hover:text-gray-900 transition"
          >
            <SkipBack className="w-3 h-3" />
          </button>
          <Play className="w-3 h-3 text-gray-400" />
          <button
            onClick={() => setSelectedTick(maxTick)}
            className="text-gray-400 hover:text-gray-900 transition"
          >
            <SkipForward className="w-3 h-3" />
          </button>
          <input
            type="range"
            min={history[0]?.tick ?? 0}
            max={maxTick}
            value={selectedTick ?? maxTick}
            onChange={(e) => setSelectedTick(Number(e.target.value))}
            className="flex-1 h-1 accent-cyan-500 cursor-pointer"
          />
          <span className="text-[9px] font-mono text-gray-400 w-12 text-right">
            T={selectedTick ?? maxTick}
          </span>
        </div>

        {/* Snapshot at selected tick */}
        {selectedSnapshot && (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[10px] font-bold text-cyan-600 tabular-nums">{selectedSnapshot.ai_queue_depth}</div>
              <div className="text-[8px] text-gray-400">AI Queue</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-red-600 tabular-nums">{selectedSnapshot.fifo_queue_depth}</div>
              <div className="text-[8px] text-gray-400">FIFO Queue</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-900 tabular-nums">{selectedSnapshot.ai_processed}</div>
              <div className="text-[8px] text-gray-400">Processed</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-600 tabular-nums">{selectedSnapshot.rerouted_total}</div>
              <div className="text-[8px] text-gray-400">Rerouted</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
