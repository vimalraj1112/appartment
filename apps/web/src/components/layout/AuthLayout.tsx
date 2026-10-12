import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/auth-context";
import { homePathForRole } from "../../lib/roles";
import { Icon } from "../ui/icons";

const HIGHLIGHTS = [
  "Gate security and visitor passes",
  "Maintenance, complaints and amenity bookings",
  "Transparent community finances",
  "AI assistance for residents and staff",
];

export function AuthLayout() {
  const { status, user } = useAuth();

  if (status === "authenticated" && user) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--color-primary)] p-10 text-[var(--color-primary-foreground)] lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
            <Icon name="building" className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold">SuperLink Community</span>
        </div>

        <div className="max-w-md space-y-6">
          <h1 className="text-3xl font-semibold leading-tight">
            Smart living. Safer communities. One connected platform.
          </h1>
          <ul className="space-y-3 text-sm text-white/85">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon name="shield" className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/60">
          © {new Date().getFullYear()} SuperLink. All rights reserved.
        </p>

        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-black/10 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)]">
              <Icon name="building" className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold">SuperLink Community</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
