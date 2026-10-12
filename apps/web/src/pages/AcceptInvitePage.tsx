import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { acceptInvitationSchema } from "@superlink/shared";
import { ApiError } from "../lib/api";
import { acceptInvitation, getPublicInvitation } from "../features/residents/resident-api";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Spinner } from "../components/ui/spinner";

type FieldErrors = Partial<Record<"firstName" | "lastName" | "password" | "confirm", string>>;

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const invitationQuery = useQuery({
    queryKey: ["public-invitation", token],
    queryFn: () => getPublicInvitation(token),
    enabled: Boolean(token),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => acceptInvitation({ token, firstName, lastName, password }),
    onSuccess: () => {
      window.setTimeout(() => navigate("/login", { replace: true }), 1500);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = acceptInvitationSchema.safeParse({ token, firstName, lastName, password });
    const errors: FieldErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "firstName" || key === "lastName" || key === "password") errors[key] = issue.message;
      }
    }
    if (password !== confirm) errors.confirm = "Passwords do not match";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    mutation.mutate();
  };

  if (!token || invitationQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Invitation unavailable</CardTitle>
          <CardDescription>This invitation link is invalid or has expired.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/login" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (invitationQuery.isLoading || !invitationQuery.data) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </CardContent>
      </Card>
    );
  }

  const invitation = invitationQuery.data;

  if (!invitation.valid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Invitation expired</CardTitle>
          <CardDescription>Ask your community admin to send a new invitation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/login" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  const errorMessage =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? "Unable to accept invitation." : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Join {invitation.communityName}</CardTitle>
        <CardDescription>
          You've been invited as a {invitation.role.toLowerCase().replace(/_/g, " ")}
          {invitation.email ? ` (${invitation.email})` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isSuccess ? (
          <div className="space-y-4">
            <Alert variant="success">Your account is ready. Redirecting you to sign in…</Alert>
            <Button className="w-full" onClick={() => navigate("/login", { replace: true })}>
              Go to sign in
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.firstName)}
                />
                {fieldErrors.firstName && (
                  <p className="text-xs text-[var(--color-destructive)]">{fieldErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.lastName)}
                />
                {fieldErrors.lastName && (
                  <p className="text-xs text-[var(--color-destructive)]">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password && (
                <p className="text-xs text-[var(--color-destructive)]">{fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={Boolean(fieldErrors.confirm)}
              />
              {fieldErrors.confirm && (
                <p className="text-xs text-[var(--color-destructive)]">{fieldErrors.confirm}</p>
              )}
            </div>

            <Button type="submit" className="w-full" loading={mutation.isPending}>
              Create account
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
