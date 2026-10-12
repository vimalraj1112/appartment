import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { forgotPasswordSchema } from "@superlink/shared";
import { forgotPasswordRequest } from "../features/auth/auth-api";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (value: string) => forgotPasswordRequest(value),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Enter a valid email address");
      return;
    }
    setFieldError(null);
    mutation.mutate(parsed.data.email);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to choose a new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isSuccess ? (
          <Alert variant="success">
            If an account exists for that email, a reset link has been sent.
          </Alert>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldError)}
              />
              {fieldError && <p className="text-xs text-[var(--color-destructive)]">{fieldError}</p>}
            </div>
            <Button type="submit" className="w-full" loading={mutation.isPending}>
              Send reset link
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
          <Link to="/login" className="font-medium text-[var(--color-primary)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
