import type { OccupantRelation, UserStatus } from "@superlink/shared";
import { apiRequest, apiRequestPage, type Page } from "../../lib/api";

export interface ResidentOccupancy {
  id: string;
  relation: OccupantRelation;
  isPrimary: boolean;
  flat: { id: string; code: string };
}

export interface Resident {
  id: string;
  role: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  flatOccupancies: ResidentOccupancy[];
}

export interface ResidentDetail extends Resident {
  flatOccupancies: Array<
    ResidentOccupancy & {
      movedInAt: string | null;
      flat: ResidentOccupancy["flat"] & {
        type: string | null;
        status: string;
        floor: { id: string; number: number; label: string; building: { id: string; name: string } };
      };
    }
  >;
}

export function listResidents(params: {
  q?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
}): Promise<Page<Resident>> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<Resident>(`/residents?${search.toString()}`);
}

export function getResident(id: string): Promise<ResidentDetail> {
  return apiRequest<ResidentDetail>(`/residents/${id}`);
}

export function createResident(body: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  flatId?: string;
  relation?: OccupantRelation;
}): Promise<ResidentDetail> {
  return apiRequest<ResidentDetail>("/residents", { method: "POST", body });
}

export function updateResident(
  id: string,
  body: Partial<{ firstName: string; lastName: string; phone: string | null; status: UserStatus }>,
): Promise<ResidentDetail> {
  return apiRequest<ResidentDetail>(`/residents/${id}`, { method: "PATCH", body });
}

export function assignFlat(
  id: string,
  body: { flatId: string; relation: OccupantRelation; isPrimary?: boolean },
): Promise<ResidentDetail> {
  return apiRequest<ResidentDetail>(`/residents/${id}/flats`, { method: "POST", body });
}

export function unassignFlat(id: string, occupantId: string): Promise<ResidentDetail> {
  return apiRequest<ResidentDetail>(`/residents/${id}/flats/${occupantId}`, { method: "DELETE" });
}

// ---------- Invitations ----------

export interface Invitation {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  flatId: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  invitedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface PublicInvitation {
  email: string | null;
  role: string;
  communityName: string;
  expiresAt: string;
  valid: boolean;
}

export function listInvitations(): Promise<Invitation[]> {
  return apiRequest<Invitation[]>("/invitations");
}

export function createInvitation(body: {
  email?: string;
  phone?: string;
  role: string;
  flatId?: string;
}): Promise<{ invitation: Invitation; acceptUrl: string }> {
  return apiRequest("/invitations", { method: "POST", body });
}

export function revokeInvitation(id: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/invitations/${id}`, { method: "DELETE" });
}

export function getPublicInvitation(token: string): Promise<PublicInvitation> {
  return apiRequest<PublicInvitation>(`/invitations/public/${token}`, { auth: false });
}

export function acceptInvitation(body: {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<{ user: { id: string; email: string } }> {
  return apiRequest("/invitations/accept", { method: "POST", body, auth: false });
}

// ---------- Onboarding ----------

export interface OnboardingState {
  step: number;
  total: number;
  completed: boolean;
  steps: Array<{ key: string; label: string; index: number; done: boolean }>;
  counts: {
    buildings: number;
    floors: number;
    flats: number;
    residents: number;
    staff: number;
  };
}

export function getOnboarding(): Promise<OnboardingState> {
  return apiRequest<OnboardingState>("/onboarding");
}

export function setOnboardingStep(step: number): Promise<OnboardingState> {
  return apiRequest<OnboardingState>("/onboarding", { method: "PATCH", body: { step } });
}
