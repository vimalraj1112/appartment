import { apiRequest, apiRequestPage, type Page } from "../../lib/api";

export type CommunityStatus = "ACTIVE" | "SUSPENDED";
export type SubscriptionStatus = "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELLED";
export type UserRole = "SUPER_ADMIN" | "COMMUNITY_ADMIN" | "SECURITY" | "RESIDENT" | "STAFF";

export interface PlatformPlanSummary {
  code: string;
  name: string;
  priceMonthlyInr: number;
}

export interface PlatformPlan {
  id: string;
  code: string;
  name: string;
  priceMonthlyInr: number;
  flatLimit: number;
  features: string[];
  isActive: boolean;
  _count?: { subscriptions: number };
}

export interface PlatformCommunity {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  status: CommunityStatus;
  createdAt: string;
  subscription?: {
    status: SubscriptionStatus;
    plan: PlatformPlanSummary;
  } | null;
  _count?: { users: number; flats: number };
}

export interface PlatformOverview {
  generatedAt: string;
  communities: { total: number; active: number; suspended: number };
  users: {
    total: number;
    residents: number;
    staff: number;
    byRole: Array<{ role: UserRole; count: number }>;
  };
  flats: { total: number };
  subscriptions: { active: number; trial: number; pastDue: number; cancelled: number };
  plans: { active: number };
  revenue: { mrrInr: number };
  growth: Array<{ period: string; count: number }>;
  recentCommunities: Array<{
    id: string;
    name: string;
    city: string | null;
    status: CommunityStatus;
    createdAt: string;
  }>;
}

export interface PlatformSubscription {
  id: string;
  status: SubscriptionStatus;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  plan: PlatformPlanSummary;
  community: { id: string; name: string; status: CommunityStatus };
}

export interface PlatformAuditEntry {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  meta: unknown;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; role: UserRole } | null;
}

// ---------- Overview ----------

export function getOverview(): Promise<PlatformOverview> {
  return apiRequest<PlatformOverview>("/platform/overview");
}

// ---------- Communities ----------

export interface CommunityQuery {
  q?: string;
  status?: CommunityStatus;
  page?: number;
  limit?: number;
}

export function listCommunities(query: CommunityQuery = {}): Promise<Page<PlatformCommunity>> {
  return apiRequestPage<PlatformCommunity>(`/platform/communities${toQuery(query)}`);
}

export interface CreateCommunityInput {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  planCode?: string;
}

export function createCommunity(input: CreateCommunityInput): Promise<PlatformCommunity> {
  return apiRequest<PlatformCommunity>("/platform/communities", { method: "POST", body: input });
}

export function setCommunityStatus(id: string, status: CommunityStatus): Promise<PlatformCommunity> {
  return apiRequest<PlatformCommunity>(`/platform/communities/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function assignSubscription(
  communityId: string,
  input: { planCode?: string; status?: SubscriptionStatus },
): Promise<PlatformSubscription> {
  return apiRequest<PlatformSubscription>(`/platform/communities/${communityId}/subscription`, {
    method: "PUT",
    body: input,
  });
}

// ---------- Plans ----------

export function listPlans(): Promise<PlatformPlan[]> {
  return apiRequest<PlatformPlan[]>("/platform/plans");
}

export interface PlanInput {
  code: string;
  name: string;
  priceMonthlyInr: number;
  flatLimit: number;
  features?: string[];
}

export function createPlan(input: PlanInput): Promise<PlatformPlan> {
  return apiRequest<PlatformPlan>("/platform/plans", { method: "POST", body: input });
}

export function updatePlan(
  id: string,
  input: Partial<Omit<PlanInput, "code">> & { isActive?: boolean },
): Promise<PlatformPlan> {
  return apiRequest<PlatformPlan>(`/platform/plans/${id}`, { method: "PATCH", body: input });
}

// ---------- Subscriptions ----------

export interface SubscriptionQuery {
  q?: string;
  status?: SubscriptionStatus;
  page?: number;
  limit?: number;
}

export function listSubscriptions(query: SubscriptionQuery = {}): Promise<Page<PlatformSubscription>> {
  return apiRequestPage<PlatformSubscription>(`/platform/subscriptions${toQuery(query)}`);
}

// ---------- Audit ----------

export interface AuditQuery {
  q?: string;
  action?: string;
  page?: number;
  limit?: number;
}

export function listAudit(query: AuditQuery = {}): Promise<Page<PlatformAuditEntry>> {
  return apiRequestPage<PlatformAuditEntry>(`/platform/audit${toQuery(query)}`);
}

function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
