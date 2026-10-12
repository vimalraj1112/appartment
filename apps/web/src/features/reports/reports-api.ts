import { apiRequest } from "../../lib/api";

export interface ReportOverview {
  generatedAt: string;
  flats: { total: number; occupied: number; vacant: number; blocked: number; occupancyRate: number };
  residents: { total: number; active: number; invited: number };
  visitors: { activePasses: number; pendingPasses: number; entriesToday: number };
  complaints: {
    total: number;
    open: number;
    resolved: number;
    resolutionRate: number;
    avgResolutionHours: number | null;
    byStatus: Array<{ status: string; count: number }>;
  };
  billing: {
    period: string;
    billedInr: number;
    collectedInr: number;
    outstandingInr: number;
    overdueInr: number;
    collectionRate: number;
  };
  expenses: { thisMonthInr: number };
  emergency: { active: number; last90Days: number };
}

export interface TrendPoint {
  period: string;
  label: string;
  billedInr: number;
  collectedInr: number;
}

export interface Breakdown {
  complaintsByStatus: Array<{ status: string; count: number }>;
  complaintsByPriority: Array<{ priority: string; count: number }>;
  complaintsByCategory: Array<{ name: string; count: number }>;
  expensesByCategory: Array<{ name: string; amountInr: number }>;
  emergencyByCategory: Array<{ category: string; count: number }>;
}

export interface ScorecardMetric {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface Scorecard {
  generatedAt: string;
  overall: number;
  grade: string;
  metrics: ScorecardMetric[];
  summary: {
    residents: number;
    flats: number;
    openComplaints: number;
    averageResolutionHours: number | null;
  };
}

export interface HandoverPerson {
  id: string;
  firstName: string;
  lastName: string;
}

export interface HandoverVisitorEntry {
  id: string;
  direction: "IN" | "OUT";
  method: "QR" | "WALK_IN" | "MANUAL";
  createdAt: string;
  note: string | null;
  visitor: { id: string; name: string; phone: string | null; flat: { code: string } | null };
  pass: { code: string } | null;
  guard: HandoverPerson | null;
}

export interface HandoverDelivery {
  id: string;
  status: string;
  createdAt: string;
  delivery: {
    id: string;
    category: string;
    company: string | null;
    personName: string | null;
    flat: { code: string } | null;
  };
  guard: HandoverPerson | null;
}

export interface HandoverStaffEntry {
  id: string;
  direction: "IN" | "OUT";
  createdAt: string;
  note: string | null;
  staff: HandoverPerson;
  guard: HandoverPerson | null;
}

export interface HandoverAlert {
  id: string;
  category: string;
  status: string;
  note: string | null;
  createdAt: string;
  flat: { code: string } | null;
  user: HandoverPerson;
}

export interface HandoverReport {
  window: { from: string; to: string; hours: number };
  totals: {
    visitorEntries: number;
    visitorIn: number;
    visitorOut: number;
    walkIns: number;
    deliveries: number;
    deliveryEvents: number;
    staffEntries: number;
    emergencyAlerts: number;
  };
  activeAlerts: number;
  visitorEntries: HandoverVisitorEntry[];
  deliveries: HandoverDelivery[];
  deliveriesByStatus: Record<string, number>;
  staffEntries: HandoverStaffEntry[];
  emergencyAlerts: HandoverAlert[];
}

export function getOverview(): Promise<ReportOverview> {
  return apiRequest<ReportOverview>("/reports/overview");
}

export function getTrends(months = 6): Promise<TrendPoint[]> {
  return apiRequest<TrendPoint[]>(`/reports/trends?months=${months}`);
}

export function getBreakdown(): Promise<Breakdown> {
  return apiRequest<Breakdown>("/reports/breakdown");
}

export function getScorecard(): Promise<Scorecard> {
  return apiRequest<Scorecard>("/reports/scorecard");
}

export function getHandover(params: { from?: string; to?: string } = {}): Promise<HandoverReport> {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  const suffix = search.toString();
  return apiRequest<HandoverReport>(`/handover${suffix ? `?${suffix}` : ""}`);
}
