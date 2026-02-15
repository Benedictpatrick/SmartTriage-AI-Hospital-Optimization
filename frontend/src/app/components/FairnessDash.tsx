"use client";

import { useEffect, useState } from "react";
import { FairnessMetrics, ModelMetrics, getModelMetrics, getFairnessReport } from "../lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { Scale, BarChart3, Shield } from "lucide-react";

export default function FairnessDash() {
  const [fairness, setFairness] = useState<FairnessMetrics | null>(null);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getFairnessReport(), getModelMetrics()])
      .then(([f, m]) => { setFairness(f); setMetrics(m); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="card text-red-600 text-sm">{error}</div>;
  if (!fairness || !metrics) return <div className="card text-gray-400 text-sm text-center py-8">Loading metrics...</div>;

  // Model comparison data
  const comparisonData = [
    { name: "Rule-Based", accuracy: Math.round(metrics.rule_based_accuracy * 100) },
    { name: "ML (XGBoost)", accuracy: Math.round(metrics.ml_accuracy * 100) },
    { name: "Hybrid", accuracy: Math.round(metrics.hybrid_accuracy * 100) },
  ];
  const comparisonColors = ["#64748b", "#3b82f6", "#22c55e"];

  // Gender risk distribution
  const genderData: { risk: string; [key: string]: string | number }[] = [];
  const genders = Object.keys(fairness.gender_risk_distribution);
  const risks = ["Low", "Medium", "High", "Critical"];
  risks.forEach(r => {
    const row: Record<string, string | number> = { risk: r };
    genders.forEach(g => {
      row[g] = Math.round((fairness.gender_risk_distribution[g]?.[r] || 0) * 100);
    });
    genderData.push(row as { risk: string; [key: string]: string | number });
  });
  const genderColors = ["#3b82f6", "#ec4899", "#a855f7"];

  // Age FPR data
  const fprData = Object.entries(fairness.age_group_fpr).map(([group, fpr]) => ({
    group,
    fpr: Math.round(fpr * 1000) / 10,
  }));

  return (
    <div className="space-y-4">
      {/* Model Comparison */}
      <div className="card">
        <div className="card-header flex items-center gap-2 mb-2">
          <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
          <span>Model Comparison</span>
        </div>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ left: 10, right: 10 }}>
              <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#374151", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "0.5rem", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(val: any) => [`${val}%`, "Accuracy"]}
              />
              <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                {comparisonData.map((_, i) => (
                  <Cell key={i} fill={comparisonColors[i]} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-gray-500 text-center mt-1">
          {metrics.hybrid_accuracy >= metrics.ml_accuracy
            ? "✓ Hybrid engine outperforms both baselines"
            : "ML model shows strong standalone performance"}
        </div>
      </div>

      {/* Fairness Dashboard */}
      <div className="card">
        <div className="card-header flex items-center gap-2 mb-2">
          <Scale className="w-3.5 h-3.5 text-purple-600" />
          <span>Fairness & Bias Analysis</span>
        </div>

        {/* Metrics badges */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Statistical Parity Diff</div>
            <div className={`text-xl font-bold ${fairness.statistical_parity_diff < 0.1 ? "text-green-600" : "text-red-600"}`}>
              {fairness.statistical_parity_diff.toFixed(4)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {fairness.statistical_parity_diff < 0.1 ? "✓ Fair" : "⚠ Bias detected"}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Equalized Odds Diff</div>
            <div className={`text-xl font-bold ${fairness.equalized_odds_diff < 0.1 ? "text-green-600" : "text-red-600"}`}>
              {fairness.equalized_odds_diff.toFixed(4)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {fairness.equalized_odds_diff < 0.1 ? "✓ Fair" : "⚠ Bias detected"}
            </div>
          </div>
        </div>

        {/* Gender Risk Distribution */}
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Risk Distribution by Gender (%)</h3>
        <div className="h-[180px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={genderData} margin={{ left: 10 }}>
              <XAxis dataKey="risk" tick={{ fill: "#6B7280", fontSize: 11 }} />
              <YAxis tick={{ fill: "#374151", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "0.5rem", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              />
              <Legend formatter={(v: string) => <span className="text-gray-700 text-xs">{v}</span>} />
              {genders.map((g, i) => (
                <Bar key={g} dataKey={g} fill={genderColors[i % genderColors.length]} fillOpacity={0.7} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Age Group FPR */}
        <h3 className="text-sm font-semibold text-gray-700 mb-2">False Positive Rate by Age Group</h3>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fprData} margin={{ left: 10 }}>
              <XAxis dataKey="group" tick={{ fill: "#6B7280", fontSize: 11 }} />
              <YAxis tick={{ fill: "#374151", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "0.5rem", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(val: any) => [`${val}%`, "FPR"]}
              />
              <Bar dataKey="fpr" fill="#a855f7" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AUC-ROC per class */}
      {metrics.risk_classifier?.auc_roc && (
        <div className="card">
          <div className="card-header flex items-center gap-2 mb-2">
            <Shield className="w-3.5 h-3.5 text-green-600" />
            <span>AUC-ROC per Risk Level</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(metrics.risk_classifier.auc_roc).map(([level, auc]) => (
              <div key={level} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                <div className="text-xs text-gray-500">{level}</div>
                <div className="text-lg font-bold text-gray-900">{(auc as number).toFixed(3)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
