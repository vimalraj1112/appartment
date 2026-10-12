import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { Role } from "@superlink/shared";
import { useAuth } from "../../features/auth/auth-context";
import { homePathForRole } from "../../lib/roles";

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homePathForRole(user.role)} replace />;

  return <>{children}</>;
}
