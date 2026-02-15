/* MedBrain API Client — Command Center Edition v2 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

// ── Interfaces ─────────────────────────────────────────────

export interface VitalsInput {
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  heart_rate?: number | null;
  spo2?: number | null;
  temperature?: number | null;
  respiratory_rate?: number | null;
}

export interface PatientInput {
  name?: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  vitals: VitalsInput;
  conditions: string[];
  symptoms_text: string;
  ehr_text?: string;
}

export interface ShapFeature {
  feature: string;
  value: number;
  contribution: number;
}

export interface ProtocolExplanation {
  protocol_basis: string[];
  vital_interpretation: string[];
  department_reasoning: string;
  risk_justification: string;
  guideline_references: string[];
}

export interface TriageResult {
  patient_id: string;
  risk_score: number;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  needs_manual_review: boolean;
  department: string;
  department_fallback: string | null;
  explanation: ShapFeature[];
  explanation_text: string;
  ml_probability: number;
  clinical_rule_score: number;
  vital_abnormality_index: number;
  // Newly exposed clinical data
  clinical_rules_triggered: string[];
  vital_abnormals: string[];
  weights_used: Record<string, number>;
  ml_class_probabilities: Record<string, number>;
  protocol_explanation: ProtocolExplanation | null;
  clinical_summary?: string;
}

export interface EventEntry {
  id: string;
  timestamp: number;
  event_type: "triage" | "escalation" | "reroute" | "alert" | "system";
  severity: "info" | "warning" | "critical";
  message: string;
  patient_id: string | null;
  metadata: Record<string, unknown>;
}

export interface ScenarioConfig {
  label: string;
  description: string;
  num_patients: number;
  arrival_interval: number;
  speed_factor: number;
}

export interface DepartmentStatus {
  name: string;
  capacity: number;
  current_load: number;
  occupancy_pct: number;
  is_overloaded: boolean;
  queue_length?: number;
  critical_count?: number;
  active_patients?: number;
}

export interface QueueEntry {
  patient_id: string;
  patient_name: string | null;
  age: number;
  risk_level: string;
  risk_score: number;
  department: string;
  wait_time_seconds: number;
  position: number;
  timestamp: number;
}

export interface ImpactMetrics {
  avg_wait_before_optimization: number;
  avg_wait_after_optimization: number;
  wait_time_improvement_pct: number;
  patients_rerouted: number;
  overload_events_prevented: number;
  avg_wait_by_risk: Record<string, number>;
  critical_wait_optimized: number;
  critical_wait_fifo: number;
  critical_routing_improvement_pct: number;
  fifo_overloaded_depts: number;
  ai_overloaded_depts: number;
  total_processed_optimized: number;
  total_processed_fifo: number;
  throughput_improvement: number;
  is_precomputed?: boolean;
}

export interface FifoComparison {
  queue_length: number;
  processed_count: number;
  departments: DepartmentStatus[];
  overloaded_count: number;
  avg_wait: number;
  critical_avg_wait: number;
}

export interface PipelineStages {
  arrived: number;
  queued: number;
  treating: number;
  discharged: number;
  [key: string]: number;
}

export interface PatientTransition {
  patient_id: string;
  name: string;
  risk_level: string;
  from_stage: string;
  to_stage: string;
  department: string;
  tick: number;
  rerouted: boolean;
  rerouted_from?: string | null;
}

export interface SystemInfo {
  arrival_rate: number;
  avg_service_ticks: number;
  scenario_label: string;
  total_capacity: number;
  active_departments: number;
  ai_mode: boolean;
}

export interface QueueTheoryMetrics {
  lambda_arrival_rate: number;
  mu_service_rate: number;
  c_servers: number;
  rho_utilization: number;
  erlang_c_probability: number;
  lq_queue_length_observed: number;
  lq_queue_length_theoretical: number;
  wq_wait_time_observed: number;
  throughput_rate: number;
  total_arrivals: number;
  total_processed: number;
  elapsed_seconds: number;
  system_stable: boolean;
  stability_margin: number;
  dept_utilization: Record<string, number>;
}

export interface SimulationState {
  tick: number;
  elapsed_seconds: number;
  queue: QueueEntry[];
  departments: DepartmentStatus[];
  processed_count: number;
  total_patients: number;
  risk_distribution: Record<string, number>;
  impact_metrics?: ImpactMetrics;
  queue_theory?: QueueTheoryMetrics;
  fifo_comparison?: FifoComparison;
  simulation_complete?: boolean;
  scenario?: string;
  manual_review_count?: number;
  recommendations?: Recommendation[];
  state_history?: StateSnapshot[];
  pipeline_stages?: PipelineStages;
  recent_transitions?: PatientTransition[];
  department_queues?: DepartmentStatus[];
  system_info?: SystemInfo;
}

export interface Recommendation {
  type: "staffing" | "capacity" | "diversion" | "deferral" | "alert";
  priority: "critical" | "high" | "medium" | "low";
  message: string;
  detail: string;
  metric?: string;
}

export interface StateSnapshot {
  tick: number;
  ai_queue_depth: number;
  fifo_queue_depth: number;
  ai_processed: number;
  fifo_processed: number;
  ai_avg_wait: number;
  fifo_avg_wait: number;
  rerouted_total: number;
  risk_distribution: Record<string, number>;
  dept_occupancy: Record<string, number>;
}

export interface MonitoringData {
  per_class_metrics: Record<string, Record<string, number>>;
  confusion_matrix: number[][];
  cv_stats: { accuracy_mean: number; accuracy_std: number; f1_macro_mean: number };
  auc_roc: Record<string, number>;
  model_accuracies: { rule_based: number; ml: number; hybrid: number };
  drift: {
    kl_divergence: number;
    status: "Normal" | "Watch" | "Alert";
    prediction_count: number;
    live_distribution: Record<string, number>;
    training_distribution: Record<string, number>;
  };
}

export interface FairnessMetrics {
  gender_risk_distribution: Record<string, Record<string, number>>;
  age_group_fpr: Record<string, number>;
  statistical_parity_diff: number;
  equalized_odds_diff: number;
}

export interface ModelMetrics {
  rule_based_accuracy: number;
  ml_accuracy: number;
  hybrid_accuracy: number;
  risk_classifier: {
    cv_accuracy_mean: number;
    cv_accuracy_std: number;
    per_class_metrics: Record<string, Record<string, number>>;
    auc_roc: Record<string, number>;
  };
  fairness: FairnessMetrics;
}

export interface EdgeCaseResults {
  edge_cases: Record<string, TriageResult>;
  descriptions: Record<string, string>;
}

// ── API Functions ──────────────────────────────────────────

export async function predictTriage(patient: PatientInput): Promise<TriageResult> {
  const res = await fetch(`${API_BASE}/api/triage/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patient),
  });
  if (!res.ok) throw new Error(`Triage failed: ${res.statusText}`);
  return res.json();
}

export async function getDepartmentLoads(): Promise<{ departments: DepartmentStatus[] }> {
  const res = await fetch(`${API_BASE}/api/department/load`);
  if (!res.ok) throw new Error("Failed to get department loads");
  return res.json();
}

export async function getModelMetrics(): Promise<ModelMetrics> {
  const res = await fetch(`${API_BASE}/api/metrics`);
  if (!res.ok) throw new Error("Failed to get metrics");
  return res.json();
}

export async function getFairnessReport(): Promise<FairnessMetrics> {
  const res = await fetch(`${API_BASE}/api/fairness/report`);
  if (!res.ok) throw new Error("Failed to get fairness report");
  return res.json();
}

export async function getHealthStatus(): Promise<{ status: string; models_loaded: Record<string, boolean> }> {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

export async function getImpactMetrics(): Promise<ImpactMetrics> {
  const res = await fetch(`${API_BASE}/api/impact-metrics`);
  if (!res.ok) throw new Error("Failed to get impact metrics");
  return res.json();
}

export async function runEdgeCaseDemo(): Promise<EdgeCaseResults> {
  const res = await fetch(`${API_BASE}/api/demo/edge-cases`);
  if (!res.ok) throw new Error("Failed to run edge cases");
  return res.json();
}

export async function getRecentEvents(limit = 50): Promise<{ events: EventEntry[]; total: number }> {
  const res = await fetch(`${API_BASE}/api/events/recent?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to get events");
  return res.json();
}

export async function getScenarios(): Promise<{ scenarios: Record<string, ScenarioConfig> }> {
  const res = await fetch(`${API_BASE}/api/simulation/scenarios`);
  if (!res.ok) throw new Error("Failed to get scenarios");
  return res.json();
}

export async function getRecommendations(): Promise<{ recommendations: Recommendation[] }> {
  const res = await fetch(`${API_BASE}/api/recommendations`);
  if (!res.ok) throw new Error("Failed to get recommendations");
  return res.json();
}

export async function getModelMonitoring(): Promise<MonitoringData> {
  const res = await fetch(`${API_BASE}/api/model/monitoring`);
  if (!res.ok) throw new Error("Failed to get monitoring data");
  return res.json();
}

export function createSimulationWebSocket(
  onMessage: (state: SimulationState) => void,
  onError?: (error: Event) => void,
  onClose?: () => void,
  scenario?: string
): WebSocket {
  const wsUrl = API_BASE.replace("http", "ws") + "/ws/simulation";
  const ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    // Send scenario config as the first message
    if (scenario) {
      ws.send(JSON.stringify({ scenario }));
    }
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  ws.onerror = (e) => onError?.(e);
  ws.onclose = () => onClose?.();
  return ws;
}
