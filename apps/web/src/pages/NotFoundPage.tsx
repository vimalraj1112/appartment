import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";
import { homePathForRole } from "../lib/roles";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export function NotFoundPage() {
  const { status, user } = useAuth();
  const home = status === "authenticated" && user ? homePathForRole(user.role) : "/login";

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <p className="text-5xl font-semibold text-[var(--color-primary)]">404</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            We couldn&apos;t find the page you were looking for.
          </p>
          <Link to={home}>
            <Button>Take me home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
