import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { loginSchema } from "@superlink/shared";
import { ApiError } from "../lib/api";
import { homePathForRole } from "../lib/roles";
import { useAuth } from "../features/auth/auth-context";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: (values: { email: string; password: string }) => login(values.email, values.password),
    onSuccess: (user) => {
      navigate(from ?? homePathForRole(user.role), { replace: true });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "email" || key === "password") errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    mutation.mutate(parsed.data);
  };

  const errorMessage =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? "Unable to sign in." : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your community workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p className="text-xs text-[var(--color-destructive)]">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password && (
              <p className="text-xs text-[var(--color-destructive)]">{fieldErrors.password}</p>
            )}
          </div>

          <Button type="submit" className="w-full" loading={mutation.isPending}>
            Sign in
          </Button>
        </form>

        <div className="mt-6 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/50 p-3 text-xs text-[var(--color-muted-foreground)]">
          <p className="font-medium text-[var(--color-foreground)]">Demo accounts</p>
          <p className="mt-1">
            super@superlink.dev · admin@greenvalley.dev · security@greenvalley.dev · staff@greenvalley.dev ·
            resident@greenvalley.dev
          </p>
          <p className="mt-1">Password: <span className="font-mono">Password123!</span></p>
        </div>
      </CardContent>
    </Card>
  );
}
