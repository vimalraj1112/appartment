import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { ROLE_LABELS } from "../../lib/roles";
import { useAuth } from "../../features/auth/auth-context";
import { useTheme } from "../../features/theme/theme-provider";
import type { NavItem } from "../../features/navigation/nav-config";
import { Button } from "../ui/button";
import { Icon } from "../ui/icons";
import { PageTransition } from "../motion/page-transition";
import { NotificationBell } from "./NotificationBell";

function BrandMark() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)]">
      <Icon name="building" className="h-5 w-5" />
    </span>
  );
}

function SidebarContent({
  nav,
  sectionLabel,
  onNavigate,
}: {
  nav: NavItem[];
  sectionLabel: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <BrandMark />
        <div className="leading-tight">
          <p className="text-sm font-semibold">SuperLink</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">{sectionLabel}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
              )
            }
          >
            <Icon name={item.icon} className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function UserFooter() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (!user) return null;

  return (
    <div className="border-t border-[var(--color-border)] p-3">
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-muted)] text-sm font-semibold">
          {user.firstName.charAt(0)}
          {user.lastName.charAt(0)}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {ROLE_LABELS[user.role]}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="mt-1 w-full justify-start" onClick={handleLogout}>
        <Icon name="log-out" className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}

export function AppShell({ nav, sectionLabel }: { nav: NavItem[]; sectionLabel: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex lg:flex-col">
        <SidebarContent nav={nav} sectionLabel={sectionLabel} />
        <div className="mt-auto">
          <UserFooter />
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            >
              <SidebarContent
                nav={nav}
                sectionLabel={sectionLabel}
                onNavigate={() => setMobileOpen(false)}
              />
              <div className="mt-auto">
                <UserFooter />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Icon name="menu" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{sectionLabel}</h1>
          </div>
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle colour theme"
            onClick={toggleTheme}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </Button>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname} className="mx-auto w-full max-w-6xl">
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
