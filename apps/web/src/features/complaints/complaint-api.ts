import type { ComplaintPriority, ComplaintStatus } from "@superlink/shared";
import { apiRequest, apiRequestPage, type Page } from "../../lib/api";

export interface ComplaintUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  location: string | null;
  rating: number | null;
  createdAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  raisedBy: ComplaintUser;
  assignedTo: ComplaintUser | null;
  category: { id: string; name: string } | null;
  flat: { id: string; code: string } | null;
  _count?: { comments: number };
}

export interface ComplaintComment {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: ComplaintUser & { role: string };
}

export interface ComplaintAssignment {
  id: string;
  note: string | null;
  createdAt: string;
  staff: ComplaintUser;
  assignedBy: ComplaintUser | null;
}

export interface ComplaintDetail {
  complaint: Complaint;
  comments: ComplaintComment[];
  assignments: ComplaintAssignment[];
}

export interface ComplaintCategory {
  id: string;
  name: string;
  description: string | null;
  slaHours: number | null;
  sortOrder: number;
  isActive: boolean;
}

// ---------- Categories ----------

export function listCategories(params: { includeInactive?: boolean } = {}): Promise<ComplaintCategory[]> {
  const search = new URLSearchParams();
  if (params.includeInactive) search.set("includeInactive", "true");
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiRequest<ComplaintCategory[]>(`/complaints/categories${suffix}`);
}

export function createCategory(body: {
  name: string;
  description?: string;
  slaHours?: number;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<ComplaintCategory> {
  return apiRequest<ComplaintCategory>("/complaints/categories", { method: "POST", body });
}

export function updateCategory(
  id: string,
  body: Partial<{ name: string; description: string; slaHours: number; sortOrder: number; isActive: boolean }>,
): Promise<ComplaintCategory> {
  return apiRequest<ComplaintCategory>(`/complaints/categories/${id}`, { method: "PATCH", body });
}

// ---------- Complaints ----------

export function listComplaints(params: {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  categoryId?: string;
  flatId?: string;
  assignedToId?: string;
  mine?: boolean;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Page<Complaint>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.priority) search.set("priority", params.priority);
  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.flatId) search.set("flatId", params.flatId);
  if (params.assignedToId) search.set("assignedToId", params.assignedToId);
  if (params.mine) search.set("mine", "true");
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<Complaint>(`/complaints?${search.toString()}`);
}

export function getComplaint(id: string): Promise<ComplaintDetail> {
  return apiRequest<ComplaintDetail>(`/complaints/${id}`);
}

export function createComplaint(body: {
  title: string;
  description: string;
  categoryId?: string;
  flatId?: string;
  priority?: ComplaintPriority;
  location?: string;
}): Promise<Complaint> {
  return apiRequest<Complaint>("/complaints", { method: "POST", body });
}

export function updateComplaint(
  id: string,
  body: Partial<{
    title: string;
    description: string;
    categoryId: string | null;
    priority: ComplaintPriority;
    status: ComplaintStatus;
    location: string | null;
  }>,
): Promise<Complaint> {
  return apiRequest<Complaint>(`/complaints/${id}`, { method: "PATCH", body });
}

export function assignComplaint(
  id: string,
  body: { staffUserId: string; note?: string },
): Promise<Complaint> {
  return apiRequest<Complaint>(`/complaints/${id}/assign`, { method: "POST", body });
}

export function addComment(
  id: string,
  body: { body: string; isInternal?: boolean },
): Promise<{ complaintId: string; comment: ComplaintComment }> {
  return apiRequest<{ complaintId: string; comment: ComplaintComment }>(`/complaints/${id}/comments`, {
    method: "POST",
    body,
  });
}

export function rateComplaint(id: string, rating: number): Promise<Complaint> {
  return apiRequest<Complaint>(`/complaints/${id}/rating`, { method: "POST", body: { rating } });
}
