import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getDashboard } from "../features/dashboard/dashboard-api";
import { listNotifications } from "../features/notifications/notification-api";
import { useAuth } from "../features/auth/auth-context";
import { cardItem, cardStagger, hoverLift } from "../components/motion/variants";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Icon, type IconName } from "../components/ui/icons";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

const QUICK_LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: "/app/visitors", label: "Visitors", icon: "door" },
  { to: "/app/bills", label: "Bills", icon: "credit-card" },
  { to: "/app/complaints", label: "Complaints", icon: "wrench" },
  { to: "/app/community", label: "Community", icon: "megaphone" },
];

function StatCard({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  return (
    <motion.div variants={cardItem}>
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Icon name={icon} />
          </span>
          <div>
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ResidentDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
  const { data: notifications } = useQuery({
    queryKey: ["notifications", "preview"],
    queryFn: () => listNotifications({ limit: 4 }),
  });

  const firstName = useMemo(() => user?.firstName ?? data?.user.firstName ?? "", [user, data]);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const primary = data.primaryFlat;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome home, ${firstName}`}
        subtitle={data.community ? data.community.name : "Your community at a glance."}
      />

      <motion.div
        variants={cardStagger}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-3"
      >
        <StatCard icon="building" label="My flats" value={data.stats.flats} />
        <StatCard icon="users" label="Family members" value={data.stats.familyMembers} />
        <StatCard icon="bell" label="Unread notifications" value={data.stats.unreadNotifications} />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My residence</CardTitle>
          </CardHeader>
          <CardContent>
            {primary ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold">{primary.flat.code}</p>
                  <Badge variant={primary.flat.status === "OCCUPIED" ? "success" : "muted"}>
                    {primary.flat.status}
                  </Badge>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[var(--color-muted-foreground)]">Building</dt>
                    <dd className="font-medium">{primary.flat.floor.building.name}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted-foreground)]">Floor</dt>
                    <dd className="font-medium">{primary.flat.floor.label}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted-foreground)]">Type</dt>
                    <dd className="font-medium">{primary.flat.type ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted-foreground)]">You are</dt>
                    <dd className="font-medium">{primary.relation}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No flat is linked to your account yet. Please contact your community admin.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Family</CardTitle>
          </CardHeader>
          <CardContent>
            {data.familyMembers.length > 0 ? (
              <ul className="space-y-3">
                {data.familyMembers.map((member) => (
                  <li key={member.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">{member.relation}</p>
                    </div>
                    {member.phone && (
                      <span className="text-xs text-[var(--color-muted-foreground)]">{member.phone}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No family members registered.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <motion.div
        variants={cardStagger}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {QUICK_LINKS.map((item) => (
          <motion.div key={item.to} variants={cardItem}>
            <motion.div {...hoverLift}>
              <Link to={item.to} className="block">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-muted)]">
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent notifications</CardTitle>
          <Link to="/app/notifications" className="text-xs font-medium text-[var(--color-primary)]">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {notifications && notifications.data.length > 0 ? (
            <ul className="space-y-3">
              {notifications.data.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      item.readAt ? "bg-[var(--color-muted-foreground)]/40" : "bg-[var(--color-primary)]"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">You're all caught up.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
