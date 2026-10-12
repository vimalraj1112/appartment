import type { Role } from "@superlink/shared";

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Platform Admin",
  COMMUNITY_ADMIN: "Community Admin",
  SECURITY: "Security",
  RESIDENT: "Resident",
  STAFF: "Staff",
};

export function homePathForRole(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/platform";
    case "COMMUNITY_ADMIN":
      return "/admin";
    case "SECURITY":
      return "/guard";
    default:
      return "/app";
  }
}
