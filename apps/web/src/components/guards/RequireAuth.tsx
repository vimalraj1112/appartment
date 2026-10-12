import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/auth-context";
import { FullPageLoader } from "../ui/full-page-loader";

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageLoader label="Preparing your workspace…" />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
