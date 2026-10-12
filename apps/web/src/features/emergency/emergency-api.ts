import type { EmergencyAlertStatus, EmergencyCategory } from "@superlink/shared";
import { apiRequest, apiRequestPage, type Page } from "../../lib/api";

export interface EmergencyPerson {
  id: string;
  firstName: string;
  lastName: string;
}

export interface EmergencyAlert {
  id: string;
  flatId: string | null;
  category: EmergencyCategory;
  status: EmergencyAlertStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  flat: { id: string; code: string } | null;
  user: EmergencyPerson;
  acknowledgedBy: EmergencyPerson | null;
  resolvedBy: EmergencyPerson | null;
}

export function listAlerts(params: {
  status?: EmergencyAlertStatus;
  category?: EmergencyCategory;
  flatId?: string;
  mine?: boolean;
  page?: number;
  limit?: number;
} = {}): Promise<Page<EmergencyAlert>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.category) search.set("category", params.category);
  if (params.flatId) search.set("flatId", params.flatId);
  if (params.mine) search.set("mine", "true");
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 20));
  return apiRequestPage<EmergencyAlert>(`/emergency?${search.toString()}`);
}

export function getAlert(id: string): Promise<EmergencyAlert> {
  return apiRequest<EmergencyAlert>(`/emergency/${id}`);
}

export function triggerAlert(input: {
  category: EmergencyCategory;
  note?: string;
  flatId?: string;
}): Promise<EmergencyAlert> {
  return apiRequest<EmergencyAlert>("/emergency", { method: "POST", body: input });
}

export function acknowledgeAlert(id: string, note?: string): Promise<EmergencyAlert> {
  return apiRequest<EmergencyAlert>(`/emergency/${id}/acknowledge`, { method: "POST", body: { note } });
}

export function resolveAlert(id: string, note?: string): Promise<EmergencyAlert> {
  return apiRequest<EmergencyAlert>(`/emergency/${id}/resolve`, { method: "POST", body: { note } });
}
