import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPass } from "../features/visitors/visitor-api";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";

export function NewVisitorPassPage() {
  const navigate = useNavigate();
  const [created, setCreated] = useState<{ code: string; shareUrl: string } | null>(null);
  const [form, setForm] = useState({
    visitorName: "",
    visitorPhone: "",
    purpose: "",
    type: "SINGLE_USE" as "SINGLE_USE" | "TIME_WINDOW",
    validTo: "",
  });
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      createPass({
        visitorName: form.visitorName.trim(),
        visitorPhone: form.visitorPhone.trim() || undefined,
        purpose: form.purpose.trim() || undefined,
        type: form.type,
        validTo: form.type === "TIME_WINDOW" && form.validTo ? new Date(form.validTo).toISOString() : undefined,
      }),
    onSuccess: (result) => setCreated({ code: result.pass.code, shareUrl: result.shareUrl }),
  });

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (created) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pass created" subtitle="Share this code or link with your visitor." />
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">Pass code</p>
            <p className="font-mono text-3xl tracking-[0.3em]">{created.code}</p>
            <div className="rounded-md bg-[var(--color-muted)] p-3 text-xs break-all">{created.shareUrl}</div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => void copy()}>
                <Icon name={copied ? "check" : "arrow-right"} className="h-4 w-4" />
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button onClick={() => navigate("/app/visitors")}>Done</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New visitor pass"
        subtitle="Pre-approve a visitor so the gate can let them in."
        actions={
          <Link to="/app/visitors">
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Visitor details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="visitorName">Visitor name</Label>
              <Input
                id="visitorName"
                required
                value={form.visitorName}
                onChange={(event) => setForm({ ...form, visitorName: event.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="visitorPhone">Phone</Label>
                <Input
                  id="visitorPhone"
                  value={form.visitorPhone}
                  onChange={(event) => setForm({ ...form, visitorPhone: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purpose">Purpose</Label>
                <Input
                  id="purpose"
                  placeholder="Guest, delivery, cab…"
                  value={form.purpose}
                  onChange={(event) => setForm({ ...form, purpose: event.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="type">Pass type</Label>
                <Select
                  id="type"
                  value={form.type}
                  onChange={(event) =>
                    setForm({ ...form, type: event.target.value as "SINGLE_USE" | "TIME_WINDOW" })
                  }
                >
                  <option value="SINGLE_USE">Single use</option>
                  <option value="TIME_WINDOW">Time window</option>
                </Select>
              </div>
              {form.type === "TIME_WINDOW" && (
                <div className="space-y-1.5">
                  <Label htmlFor="validTo">Valid until</Label>
                  <Input
                    id="validTo"
                    type="datetime-local"
                    required
                    value={form.validTo}
                    onChange={(event) => setForm({ ...form, validTo: event.target.value })}
                  />
                </div>
              )}
            </div>

            {mutation.isError && <Alert variant="destructive">Could not create the pass. Please try again.</Alert>}

            <Button type="submit" loading={mutation.isPending}>
              Create pass
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
