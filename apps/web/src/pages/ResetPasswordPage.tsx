import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { resetPasswordSchema } from "@superlink/shared";
import { ApiError } from "../lib/api";
import { resetPasswordRequest } from "../features/auth/auth-api";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type FieldErrors = Partial<Record<"password" | "confirm", string>>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: (value: string) => resetPasswordRequest(token, value),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ token, password });
    const errors: FieldErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "password") errors.password = issue.message;
      }
    }
    if (password !== confirm) errors.confirm = "Passwords do not match";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    mutation.mutate(password);
  };

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Invalid reset link</CardTitle>
          <CardDescription>This password reset link is missing its token.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/forgot-password" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
            Request a new link
          </Link>
        </CardContent>
      </Card>
    );
  }

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "Unable to reset your password."
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Choose a new password</CardTitle>
        <CardDescription>Use at least 8 characters with a letter and a number.</CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isSuccess ? (
          <div className="space-y-4">
            <Alert variant="success">Your password has been updated. You can now sign in.</Alert>
            <Button className="w-full" onClick={() => navigate("/login")}>
              Go to sign in
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}

            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
                onChange={(event) => setConfirm(event.target.value)}
                aria-invalid={Boolean(fieldErrors.confirm)}
              />
              {fieldErrors.confirm && (
                <p className="text-xs text-[var(--color-destructive)]">{fieldErrors.confirm}</p>
              )}
            </div>

            <Button type="submit" className="w-full" loading={mutation.isPending}>
              Update password
            </Button>
          </form>
        )}

        {!mutation.isSuccess && (
          <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
            <Link to="/login" className="font-medium text-[var(--color-primary)] hover:underline">
              Back to sign in
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
