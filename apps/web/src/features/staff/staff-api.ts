import type {
  DomesticStaffStatus,
  DomesticWorkType,
  StaffAvailability,
  VisitorEntryDirection,
} from "@superlink/shared";
import { apiRequest, apiRequestPage, type Page } from "../../lib/api";

export interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
}

export interface StaffProfile {
  id: string;
  trade: string;
  availability: StaffAvailability;
  phone: string | null;
  createdAt: string;
  user: StaffUser;
}

export interface StaffEntry {
  id: string;
  direction: VisitorEntryDirection;
  note: string | null;
  createdAt: string;
  staff: { id: string; firstName: string; lastName: string };
  guard: { id: string; firstName: string; lastName: string } | null;
}

export interface DomesticStaff {
  id: string;
  flatId: string | null;
  name: string;
  phone: string | null;
  idInfo: string | null;
  workType: DomesticWorkType;
  status: DomesticStaffStatus;
  createdAt: string;
  flat: { id: string; code: string } | null;
}

// ---------- Staff profiles ----------

export function listStaffUsers(): Promise<StaffUser[]> {
  return apiRequest<StaffUser[]>("/staff/users");
}

export function listStaffProfiles(params: {
  trade?: string;
  availability?: StaffAvailability;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Page<StaffProfile>> {
  const search = new URLSearchParams();
  if (params.trade) search.set("trade", params.trade);
  if (params.availability) search.set("availability", params.availability);
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<StaffProfile>(`/staff/profiles?${search.toString()}`);
}

export function createStaffProfile(body: {
  userId: string;
  trade: string;
  availability?: StaffAvailability;
  phone?: string;
}): Promise<StaffProfile> {
  return apiRequest<StaffProfile>("/staff/profiles", { method: "POST", body });
}

export function updateStaffProfile(
  id: string,
  body: Partial<{ trade: string; availability: StaffAvailability; phone: string | null }>,
): Promise<StaffProfile> {
  return apiRequest<StaffProfile>(`/staff/profiles/${id}`, { method: "PATCH", body });
}

// ---------- Gate entries ----------

export function listStaffEntries(params: {
  staffUserId?: string;
  direction?: VisitorEntryDirection;
  page?: number;
  limit?: number;
} = {}): Promise<Page<StaffEntry>> {
  const search = new URLSearchParams();
  if (params.staffUserId) search.set("staffUserId", params.staffUserId);
  if (params.direction) search.set("direction", params.direction);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 30));
  return apiRequestPage<StaffEntry>(`/staff/entries?${search.toString()}`);
}

export function createStaffEntry(body: {
  staffUserId: string;
  direction: VisitorEntryDirection;
  note?: string;
}): Promise<StaffEntry> {
  return apiRequest<StaffEntry>("/staff/entries", { method: "POST", body });
}

// ---------- Domestic staff ----------

export function listDomesticStaff(params: {
  flatId?: string;
  workType?: DomesticWorkType;
  status?: DomesticStaffStatus;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Page<DomesticStaff>> {
  const search = new URLSearchParams();
  if (params.flatId) search.set("flatId", params.flatId);
  if (params.workType) search.set("workType", params.workType);
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<DomesticStaff>(`/staff/domestic?${search.toString()}`);
}

export function createDomesticStaff(body: {
  flatId?: string;
  name: string;
  phone?: string;
  idInfo?: string;
  workType?: DomesticWorkType;
  status?: DomesticStaffStatus;
}): Promise<DomesticStaff> {
  return apiRequest<DomesticStaff>("/staff/domestic", { method: "POST", body });
}

export function updateDomesticStaff(
  id: string,
  body: Partial<{
    name: string;
    phone: string | null;
    idInfo: string | null;
    workType: DomesticWorkType;
    status: DomesticStaffStatus;
  }>,
): Promise<DomesticStaff> {
  return apiRequest<DomesticStaff>(`/staff/domestic/${id}`, { method: "PATCH", body });
}
