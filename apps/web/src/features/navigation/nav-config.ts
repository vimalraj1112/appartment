import type { Role } from "@superlink/shared";
import type { IconName } from "../../components/ui/icons";

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  RESIDENT: [
    { to: "/app", label: "Home", icon: "home", end: true },
    { to: "/app/notifications", label: "Notifications", icon: "bell" },
    { to: "/app/visitors", label: "Visitors", icon: "door" },
    { to: "/app/bills", label: "Bills", icon: "credit-card" },
    { to: "/app/amenities", label: "Amenities", icon: "calendar" },
    { to: "/app/vehicles", label: "Vehicles", icon: "car" },
    { to: "/app/complaints", label: "Complaints", icon: "wrench" },
    { to: "/app/announcements", label: "Announcements", icon: "megaphone" },
    { to: "/app/community", label: "Community", icon: "message" },
    { to: "/app/emergency", label: "Emergency", icon: "alert-triangle" },
    { to: "/app/assistant", label: "Assistant", icon: "bot" },
  ],
  STAFF: [
    { to: "/app", label: "Home", icon: "home", end: true },
    { to: "/app/tasks", label: "My Tasks", icon: "wrench" },
    { to: "/app/announcements", label: "Announcements", icon: "megaphone" },
    { to: "/app/assistant", label: "Assistant", icon: "bot" },
  ],
  COMMUNITY_ADMIN: [
    { to: "/admin", label: "Overview", icon: "bar-chart", end: true },
    { to: "/admin/buildings", label: "Buildings", icon: "building" },
    { to: "/admin/residents", label: "Residents", icon: "users" },
    { to: "/admin/visitors", label: "Visitors", icon: "door" },
    { to: "/admin/complaints", label: "Complaints", icon: "wrench" },
    { to: "/admin/onboarding", label: "Setup", icon: "check-circle" },
    { to: "/admin/staff", label: "Staff", icon: "shield" },
    { to: "/admin/security", label: "Security", icon: "door" },
    { to: "/admin/billing", label: "Billing", icon: "credit-card" },
    { to: "/admin/expenses", label: "Expenses", icon: "file-text" },
    { to: "/admin/amenities", label: "Amenities", icon: "calendar" },
    { to: "/admin/parking", label: "Parking", icon: "car" },
    { to: "/admin/posts", label: "Announcements", icon: "megaphone" },
    { to: "/admin/community", label: "Community", icon: "message" },
    { to: "/admin/emergency", label: "Emergency", icon: "alert-triangle" },
    { to: "/admin/reports", label: "Reports", icon: "bar-chart" },
    { to: "/admin/scorecard", label: "Scorecard", icon: "check-circle" },
    { to: "/admin/ai", label: "Assistant", icon: "bot" },
    { to: "/admin/settings", label: "Settings", icon: "settings" },
  ],
  SECURITY: [
    { to: "/guard", label: "Gate Console", icon: "door", end: true },
    { to: "/guard/scan", label: "Scan", icon: "search" },
    { to: "/guard/visitors", label: "Visitors", icon: "users" },
    { to: "/guard/parking", label: "Parking", icon: "car" },
    { to: "/guard/emergency", label: "Emergency", icon: "bell" },
    { to: "/guard/handover", label: "Handover", icon: "file-text" },
    { to: "/guard/assistant", label: "Assistant", icon: "bot" },
  ],
  SUPER_ADMIN: [
    { to: "/platform", label: "Overview", icon: "bar-chart", end: true },
    { to: "/platform/communities", label: "Communities", icon: "building" },
    { to: "/platform/plans", label: "Plans", icon: "package" },
    { to: "/platform/subscriptions", label: "Subscriptions", icon: "credit-card" },
    { to: "/platform/leads", label: "Leads", icon: "mail" },
    { to: "/platform/audit", label: "Audit Log", icon: "file-text" },
    { to: "/platform/settings", label: "Settings", icon: "settings" },
  ],
};
