import { apiRequest, apiRequestPage } from "../../lib/api";

export type DemoLeadStatus = "NEW" | "CONTACTED" | "CONVERTED" | "DISMISSED";

export interface DemoLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  communityName: string;
  flats: number | null;
  message: string | null;
  status: DemoLeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LeadCreateInput {
  name: string;
  email: string;
  phone: string;
  communityName: string;
  flats?: number;
  message?: string;
}

export function submitLead(input: LeadCreateInput): Promise<DemoLead> {
  return apiRequest<DemoLead>("/leads", { method: "POST", body: input, auth: false });
}

export function listLeads(query: { q?: string; status?: DemoLeadStatus; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.status) search.set("status", query.status);
  if (query.limit) search.set("limit", String(query.limit));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiRequestPage<DemoLead>(`/platform/leads${suffix}`);
}

export function updateLeadStatus(id: string, status: DemoLeadStatus): Promise<DemoLead> {
  return apiRequest<DemoLead>(`/platform/leads/${id}`, { method: "PATCH", body: { status } });
}
