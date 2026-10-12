import { Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "./components/layout/AuthLayout";
import { AdminLayout, AppLayout, GuardLayout, PlatformLayout } from "./components/layout/RoleLayouts";
import { RequireAuth } from "./components/guards/RequireAuth";
import { RequireRole } from "./components/guards/RequireRole";
import { FullPageLoader } from "./components/ui/full-page-loader";
import { useAuth } from "./features/auth/auth-context";
import { homePathForRole } from "./lib/roles";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
import { AdminAmenitiesPage } from "./pages/AdminAmenitiesPage";
import { AdminAnnouncementsPage } from "./pages/AdminAnnouncementsPage";
import { AdminBillingPage } from "./pages/AdminBillingPage";
import { AdminCommunityPage } from "./pages/AdminCommunityPage";
import { AdminComplaintsPage } from "./pages/AdminComplaintsPage";
import { AdminExpensesPage } from "./pages/AdminExpensesPage";
import { AdminEmergencyPage } from "./pages/AdminEmergencyPage";
import { AdminParkingPage } from "./pages/AdminParkingPage";
import { AdminReportsPage } from "./pages/AdminReportsPage";
import { AdminScorecardPage } from "./pages/AdminScorecardPage";
import { AssistantPage } from "./pages/AssistantPage";
import { AdminSecurityPage } from "./pages/AdminSecurityPage";
import { AdminStaffPage } from "./pages/AdminStaffPage";
import { AdminVisitorsPage } from "./pages/AdminVisitorsPage";
import { BuildingsPage } from "./pages/BuildingsPage";
import { ComplaintDetailPage } from "./pages/ComplaintDetailPage";
import { DashboardHome } from "./pages/DashboardHome";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { GuardEmergencyPage } from "./pages/GuardEmergencyPage";
import { GuardHandoverPage } from "./pages/GuardHandoverPage";
import { GuardParkingPage } from "./pages/GuardParkingPage";
import { GuardScanPage } from "./pages/GuardScanPage";
import { GuardVisitorsPage } from "./pages/GuardVisitorsPage";
import { LoginPage } from "./pages/LoginPage";
import { LandingPage } from "./pages/LandingPage";
import { NewComplaintPage } from "./pages/NewComplaintPage";
import { NewVisitorPassPage } from "./pages/NewVisitorPassPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PlatformAuditPage } from "./pages/PlatformAuditPage";
import { PlatformCommunitiesPage } from "./pages/PlatformCommunitiesPage";
import { PlatformLeadsPage } from "./pages/PlatformLeadsPage";
import { PlatformOverviewPage } from "./pages/PlatformOverviewPage";
import { PlatformPlansPage } from "./pages/PlatformPlansPage";
import { PlatformSubscriptionsPage } from "./pages/PlatformSubscriptionsPage";
import { PublicPassPage } from "./pages/PublicPassPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ResidentAmenitiesPage } from "./pages/ResidentAmenitiesPage";
import { ResidentAnnouncementsPage } from "./pages/ResidentAnnouncementsPage";
import { ResidentBillDetailPage } from "./pages/ResidentBillDetailPage";
import { ResidentBillsPage } from "./pages/ResidentBillsPage";
import { ResidentComplaintsPage } from "./pages/ResidentComplaintsPage";
import { ResidentDashboard } from "./pages/ResidentDashboard";
import { ResidentEmergencyPage } from "./pages/ResidentEmergencyPage";
import { ResidentFeedPage } from "./pages/ResidentFeedPage";
import { ResidentVehiclesPage } from "./pages/ResidentVehiclesPage";
import { ResidentVisitorsPage } from "./pages/ResidentVisitorsPage";
import { ResidentsPage } from "./pages/ResidentsPage";
import { StaffTasksPage } from "./pages/StaffTasksPage";

function AppHome() {
  const { user, status } = useAuth();
  if (status === "loading" || !user) return <FullPageLoader />;
  return user.role === "RESIDENT" ? <ResidentDashboard /> : <DashboardHome />;
}

function LandingGate() {
  const { status, user } = useAuth();
  if (status === "loading") return <FullPageLoader />;
  if (status === "authenticated" && user) return <Navigate to={homePathForRole(user.role)} replace />;
  return <LandingPage />;
}

export function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/pass/:token" element={<PublicPassPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route
          path="/app"
          element={
            <RequireRole roles={["COMMUNITY_ADMIN", "RESIDENT", "STAFF"]}>
              <AppLayout />
            </RequireRole>
          }
        >
          <Route index element={<AppHome />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="visitors" element={<ResidentVisitorsPage />} />
          <Route path="visitors/new" element={<NewVisitorPassPage />} />
          <Route path="bills" element={<ResidentBillsPage />} />
          <Route path="bills/:id" element={<ResidentBillDetailPage />} />
          <Route path="amenities" element={<ResidentAmenitiesPage />} />
          <Route path="vehicles" element={<ResidentVehiclesPage />} />
          <Route path="complaints" element={<ResidentComplaintsPage />} />
          <Route path="complaints/new" element={<NewComplaintPage />} />
          <Route path="complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="announcements" element={<ResidentAnnouncementsPage />} />
          <Route path="community" element={<ResidentFeedPage />} />
          <Route path="emergency" element={<ResidentEmergencyPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="tasks" element={<StaffTasksPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireRole roles={["COMMUNITY_ADMIN"]}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="buildings" element={<BuildingsPage />} />
          <Route path="residents" element={<ResidentsPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="visitors" element={<AdminVisitorsPage />} />
          <Route path="complaints" element={<AdminComplaintsPage />} />
          <Route path="complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="security" element={<AdminSecurityPage />} />
          <Route path="billing" element={<AdminBillingPage />} />
          <Route path="expenses" element={<AdminExpensesPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="scorecard" element={<AdminScorecardPage />} />
          <Route path="amenities" element={<AdminAmenitiesPage />} />
          <Route path="parking" element={<AdminParkingPage />} />
          <Route path="posts" element={<AdminAnnouncementsPage />} />
          <Route path="community" element={<AdminCommunityPage />} />
          <Route path="emergency" element={<AdminEmergencyPage />} />
          <Route path="ai" element={<AssistantPage showDigest />} />
          <Route path="settings" element={<PlaceholderPage title="Community Settings" />} />
        </Route>

        <Route
          path="/guard"
          element={
            <RequireRole roles={["COMMUNITY_ADMIN", "SECURITY"]}>
              <GuardLayout />
            </RequireRole>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="scan" element={<GuardScanPage />} />
          <Route path="visitors" element={<GuardVisitorsPage />} />
          <Route path="parking" element={<GuardParkingPage />} />
          <Route path="emergency" element={<GuardEmergencyPage />} />
          <Route path="handover" element={<GuardHandoverPage />} />
          <Route path="assistant" element={<AssistantPage />} />
        </Route>

        <Route
          path="/platform"
          element={
            <RequireRole roles={["SUPER_ADMIN"]}>
              <PlatformLayout />
            </RequireRole>
          }
        >
          <Route index element={<PlatformOverviewPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="communities" element={<PlatformCommunitiesPage />} />
          <Route path="plans" element={<PlatformPlansPage />} />
          <Route path="subscriptions" element={<PlatformSubscriptionsPage />} />
          <Route path="leads" element={<PlatformLeadsPage />} />
          <Route path="audit" element={<PlatformAuditPage />} />
          <Route path="settings" element={<PlaceholderPage title="Platform Settings" />} />
        </Route>
      </Route>

      <Route path="/" element={<LandingGate />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
