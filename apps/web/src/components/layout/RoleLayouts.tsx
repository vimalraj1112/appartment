import { useAuth } from "../../features/auth/auth-context";
import { NAV_BY_ROLE } from "../../features/navigation/nav-config";
import { AppShell } from "./AppShell";

export function AppLayout() {
  const { user } = useAuth();
  const isStaff = user?.role === "STAFF";

  return (
    <AppShell
      nav={isStaff ? NAV_BY_ROLE.STAFF : NAV_BY_ROLE.RESIDENT}
      sectionLabel={isStaff ? "Staff Workspace" : "My Community"}
    />
  );
}

export function AdminLayout() {
  return <AppShell nav={NAV_BY_ROLE.COMMUNITY_ADMIN} sectionLabel="Community Admin" />;
}

export function GuardLayout() {
  return <AppShell nav={NAV_BY_ROLE.SECURITY} sectionLabel="Security Desk" />;
}

export function PlatformLayout() {
  return <AppShell nav={NAV_BY_ROLE.SUPER_ADMIN} sectionLabel="Platform Console" />;
}
