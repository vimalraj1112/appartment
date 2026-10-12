import { apiRequest } from "../../lib/api";

export interface DashboardOccupancy {
  id: string;
  relation: string;
  isPrimary: boolean;
  movedInAt: string | null;
  flat: {
    id: string;
    code: string;
    type: string | null;
    status: string;
    areaSqft: number | null;
    floor: {
      id: string;
      number: number;
      label: string;
      building: { id: string; name: string; towerCode: string | null };
    };
  };
}

export interface DashboardFamilyMember {
  id: string;
  name: string;
  relation: string;
  phone: string | null;
  age: number | null;
}

export interface DashboardData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    email: string;
    avatarUrl: string | null;
    phone: string | null;
  };
  community: { id: string; name: string } | null;
  primaryFlat: DashboardOccupancy | null;
  flats: DashboardOccupancy[];
  familyMembers: DashboardFamilyMember[];
  stats: {
    unreadNotifications: number;
    flats: number;
    familyMembers: number;
  };
}

export function getDashboard(): Promise<DashboardData> {
  return apiRequest<DashboardData>("/dashboard");
}
