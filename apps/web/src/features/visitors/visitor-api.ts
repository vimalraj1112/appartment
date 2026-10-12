import type {
  DeliveryStatus,
  VisitorEntryDirection,
  VisitorEntryMethod,
  VisitorPassStatus,
  VisitorPassType,
  WatchlistType,
} from "@superlink/shared";
import { apiRequest, apiRequestPage, type Page } from "../../lib/api";

export interface VisitorPassVisitor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  purpose: string | null;
  flatId: string | null;
}

export interface VisitorPass {
  id: string;
  code: string;
  type: VisitorPassType;
  status: VisitorPassStatus;
  validFrom: string;
  validTo: string | null;
  usedCount: number;
  maxUses: number;
  notes: string | null;
  decidedAt: string | null;
  createdAt: string;
  visitor: VisitorPassVisitor;
  flat: {
    id: string;
    code: string;
    floor: { label: string; building: { id: string; name: string } };
  };
  createdBy: { id: string; firstName: string; lastName: string } | null;
  approvedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface CreatedPass {
  pass: VisitorPass;
  qrToken: string;
  shareUrl: string;
}

export interface VisitorEntry {
  id: string;
  direction: VisitorEntryDirection;
  method: VisitorEntryMethod;
  note: string | null;
  createdAt: string;
  visitor: { id: string; name: string; phone: string | null; flatId: string | null };
  pass: { id: string; code: string } | null;
  guard: { id: string; firstName: string; lastName: string } | null;
}

export interface Delivery {
  id: string;
  category: string;
  company: string | null;
  personName: string | null;
  phone: string | null;
  status: DeliveryStatus;
  note: string | null;
  createdAt: string;
  flat: { id: string; code: string } | null;
}

export interface WatchlistEntry {
  id: string;
  type: WatchlistType;
  name: string;
  value: string | null;
  reason: string;
  active: boolean;
  createdAt: string;
  flaggedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface PublicPass {
  code: string;
  status: VisitorPassStatus;
  type: VisitorPassType;
  validFrom: string;
  validTo: string | null;
  visitorName: string;
  flatCode: string;
  communityName: string;
}

// ---------- Passes ----------

export function listPasses(params: {
  status?: VisitorPassStatus;
  flatId?: string;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Page<VisitorPass>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.flatId) search.set("flatId", params.flatId);
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<VisitorPass>(`/visitors/passes?${search.toString()}`);
}

export function getPass(id: string): Promise<VisitorPass> {
  return apiRequest<VisitorPass>(`/visitors/passes/${id}`);
}

export function createPass(body: {
  visitorName: string;
  visitorPhone?: string;
  visitorEmail?: string;
  purpose?: string;
  notes?: string;
  flatId?: string;
  type?: VisitorPassType;
  validFrom?: string;
  validTo?: string;
  maxUses?: number;
}): Promise<CreatedPass> {
  return apiRequest<CreatedPass>("/visitors/passes", { method: "POST", body });
}

export function cancelPass(id: string): Promise<VisitorPass> {
  return apiRequest<VisitorPass>(`/visitors/passes/${id}`, { method: "DELETE" });
}

export function decidePass(id: string, decision: "APPROVE" | "REJECT", notes?: string): Promise<VisitorPass> {
  return apiRequest<VisitorPass>(`/visitors/passes/${id}/decision`, {
    method: "POST",
    body: { decision, notes },
  });
}

// ---------- Gate ----------

export interface VerifyResult {
  pass: VisitorPass;
  watchlisted: boolean;
  watchlist: { id: string; type: WatchlistType; name: string; reason: string } | null;
}

export function verifyPass(code: string): Promise<VerifyResult> {
  return apiRequest<VerifyResult>("/visitors/verify", { method: "POST", body: { code } });
}

export function listEntries(params: {
  flatId?: string;
  direction?: VisitorEntryDirection;
  page?: number;
  limit?: number;
} = {}): Promise<Page<VisitorEntry>> {
  const search = new URLSearchParams();
  if (params.flatId) search.set("flatId", params.flatId);
  if (params.direction) search.set("direction", params.direction);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<VisitorEntry>(`/visitors/entries?${search.toString()}`);
}

export function registerEntry(body: {
  passId?: string;
  visitorId: string;
  direction: VisitorEntryDirection;
  method?: VisitorEntryMethod;
  note?: string;
}): Promise<VisitorEntry> {
  return apiRequest<VisitorEntry>("/visitors/entries", { method: "POST", body });
}

export function walkIn(body: {
  name: string;
  phone?: string;
  flatId: string;
  purpose?: string;
  notes?: string;
}): Promise<CreatedPass> {
  return apiRequest<CreatedPass>("/visitors/walk-in", { method: "POST", body });
}

// ---------- Deliveries ----------

export function listDeliveries(params: {
  status?: DeliveryStatus;
  flatId?: string;
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Page<Delivery>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.flatId) search.set("flatId", params.flatId);
  if (params.category) search.set("category", params.category);
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<Delivery>(`/visitors/deliveries?${search.toString()}`);
}

export function createDelivery(body: {
  flatId: string;
  category?: string;
  company?: string;
  personName?: string;
  phone?: string;
  note?: string;
}): Promise<Delivery> {
  return apiRequest<Delivery>("/visitors/deliveries", { method: "POST", body });
}

export function updateDeliveryStatus(id: string, status: DeliveryStatus, note?: string): Promise<Delivery> {
  return apiRequest<Delivery>(`/visitors/deliveries/${id}/status`, {
    method: "PATCH",
    body: { status, note },
  });
}

// ---------- Watchlist ----------

export function listWatchlist(params: {
  type?: WatchlistType;
  q?: string;
  active?: boolean;
  page?: number;
  limit?: number;
} = {}): Promise<Page<WatchlistEntry>> {
  const search = new URLSearchParams();
  if (params.type) search.set("type", params.type);
  if (params.q) search.set("q", params.q);
  if (params.active !== undefined) search.set("active", String(params.active));
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<WatchlistEntry>(`/visitors/watchlist?${search.toString()}`);
}

export function createWatchlist(body: {
  type: WatchlistType;
  name: string;
  value?: string;
  reason: string;
}): Promise<WatchlistEntry> {
  return apiRequest<WatchlistEntry>("/visitors/watchlist", { method: "POST", body });
}

export function deactivateWatchlist(id: string): Promise<WatchlistEntry> {
  return apiRequest<WatchlistEntry>(`/visitors/watchlist/${id}`, { method: "DELETE" });
}

// ---------- Public ----------

export interface GateFlat {
  id: string;
  code: string;
  floor: { label: string; building: { name: string } };
}

export function listGateFlats(): Promise<GateFlat[]> {
  return apiRequest<GateFlat[]>("/visitors/flats");
}

export function getPublicPass(token: string): Promise<PublicPass> {
  return apiRequest<PublicPass>(`/visitors/public/passes/${token}`, { auth: false });
}
