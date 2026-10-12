import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";
import { NAV_BY_ROLE } from "../features/navigation/nav-config";
import { cardItem, cardStagger, hoverLift } from "../components/motion/variants";
import { Alert } from "../components/ui/alert";
import { Card, CardContent } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { PageHeader } from "../components/ui/page-header";

export function DashboardHome() {
  const { user } = useAuth();
  if (!user) return null;

  const links = NAV_BY_ROLE[user.role].filter((item) => !item.end);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.firstName}`}
        subtitle="Here's your community at a glance."
      />

      <motion.div
        variants={cardStagger}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {links.map((item) => (
          <motion.div key={item.to} variants={cardItem}>
            <motion.div {...hoverLift}>
              <Link to={item.to} className="block">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      <Icon name={item.icon} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{item.label}</p>
                      <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                        Open {item.label.toLowerCase()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      <Alert>
        This is the Phase 1 foundation shell. Feature modules arrive in the upcoming phases.
      </Alert>
    </div>
  );
}
