import type { FlatStatus, OccupantRelation } from "@superlink/shared";
import { apiRequest, apiRequestPage, type Page } from "../../lib/api";

export interface BuildingSummary {
  id: string;
  name: string;
  towerCode: string | null;
  floorsCount: number;
  floorCount: number;
  flatCount: number;
  createdAt: string;
}

export interface FloorItem {
  id: string;
  buildingId: string;
  number: number;
  label: string;
  _count?: { flats: number };
}

export interface BuildingDetail {
  id: string;
  name: string;
  towerCode: string | null;
  floorsCount: number;
  floors: Array<{ id: string; number: number; label: string; flatCount: number }>;
}

export interface FlatOccupantSummary {
  id: string;
  relation: OccupantRelation;
  isPrimary: boolean;
  user: { id: string; firstName: string; lastName: string; email: string };
}

export interface FlatItem {
  id: string;
  floorId: string;
  code: string;
  type: string | null;
  areaSqft: number | null;
  status: FlatStatus;
  floor?: { id: string; number: number; label: string; buildingId: string };
  occupants?: FlatOccupantSummary[];
}

export interface FlatDetail {
  id: string;
  floorId: string;
  code: string;
  type: string | null;
  areaSqft: number | null;
  status: FlatStatus;
  floor: { id: string; number: number; label: string; building: { id: string; name: string; towerCode: string | null } };
  occupants: Array<FlatOccupantSummary & { user: FlatOccupantSummary["user"] & { phone: string | null; status: string } }>;
  familyMembers: Array<{ id: string; name: string; relation: string; phone: string | null; age: number | null; isStaff: boolean }>;
}

export function listBuildings(): Promise<BuildingSummary[]> {
  return apiRequest<BuildingSummary[]>("/structure/buildings");
}

export function getBuilding(id: string): Promise<BuildingDetail> {
  return apiRequest<BuildingDetail>(`/structure/buildings/${id}`);
}

export function createBuilding(body: { name: string; towerCode?: string; floorsCount?: number }): Promise<BuildingSummary> {
  return apiRequest<BuildingSummary>("/structure/buildings", { method: "POST", body });
}

export function deleteBuilding(id: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/structure/buildings/${id}`, { method: "DELETE" });
}

export function createFloor(buildingId: string, body: { number: number; label: string }): Promise<FloorItem> {
  return apiRequest<FloorItem>(`/structure/buildings/${buildingId}/floors`, { method: "POST", body });
}

export function deleteFloor(id: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/structure/floors/${id}`, { method: "DELETE" });
}

export function listFlats(params: {
  buildingId?: string;
  floorId?: string;
  status?: FlatStatus;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Page<FlatItem>> {
  const search = new URLSearchParams();
  if (params.buildingId) search.set("buildingId", params.buildingId);
  if (params.floorId) search.set("floorId", params.floorId);
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<FlatItem>(`/structure/flats?${search.toString()}`);
}

export function createFlat(body: {
  floorId: string;
  code: string;
  type?: string;
  areaSqft?: number;
  status?: FlatStatus;
}): Promise<FlatItem> {
  return apiRequest<FlatItem>("/structure/flats", { method: "POST", body });
}

export function bulkCreateFlats(body: {
  floorId: string;
  prefix: string;
  start: number;
  count: number;
  pad: number;
  type?: string;
  areaSqft?: number;
}): Promise<{ created: number; skipped: number; flats: FlatItem[] }> {
  return apiRequest("/structure/flats/bulk", { method: "POST", body });
}

export function getFlat(id: string): Promise<FlatDetail> {
  return apiRequest<FlatDetail>(`/structure/flats/${id}`);
}

export function deleteFlat(id: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/structure/flats/${id}`, { method: "DELETE" });
}
