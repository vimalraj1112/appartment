import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getOnboarding, setOnboardingStep } from "../features/residents/resident-api";
import { ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

export function OnboardingPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["onboarding"],
    queryFn: getOnboarding,
  });

  const mutation = useMutation({
    mutationFn: (step: number) => setOnboardingStep(step),
    onSuccess: (state) => queryClient.setQueryData(["onboarding"], state),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (error || !data) {
    return <Alert variant="destructive">{(error as ApiError)?.message ?? "Unable to load onboarding."}</Alert>;
  }

  const nextStep = Math.min(data.step + 1, data.total);
  const counts = [
    { label: "Buildings", value: data.counts.buildings, icon: "building" as const },
    { label: "Floors", value: data.counts.floors, icon: "layers" as const },
    { label: "Flats", value: data.counts.flats, icon: "home" as const },
    { label: "Residents", value: data.counts.residents, icon: "users" as const },
    { label: "Staff", value: data.counts.staff, icon: "shield" as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Community setup"
        subtitle="Complete these steps to get your community ready."
        actions={
          data.completed ? (
            <Badge variant="success">Setup complete</Badge>
          ) : (
            <Button
              onClick={() => mutation.mutate(nextStep)}
              loading={mutation.isPending}
              disabled={data.step >= data.total}
            >
              {data.step === 0 ? "Start setup" : "Mark step complete"}
              <Icon name="arrow-right" className="h-4 w-4" />
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {counts.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Icon name={item.icon} />
              </span>
              <div>
                <p className="text-lg font-semibold leading-none">{item.value}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {data.steps.map((step) => {
            const active = step.index === data.step;
            const done = step.index < data.step;
            return (
              <div
                key={step.key}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
                  active && "bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]/20",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs",
                    done && "border-transparent bg-[var(--color-success)] text-[var(--color-success-foreground)]",
                    active && !done && "border-[var(--color-primary)] text-[var(--color-primary)]",
                    !done && !active && "border-[var(--color-border)] text-[var(--color-muted-foreground)]",
                  )}
                >
                  {done ? <Icon name="check" className="h-4 w-4" /> : step.index + 1}
                </span>
                <span className={cn("flex-1", done && "text-[var(--color-muted-foreground)] line-through")}>
                  {step.label}
                </span>
                {active && !done && <Badge variant="default">Current</Badge>}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Alert variant="info">
          You can revisit setup anytime. Structure and resident data you add is saved as you go.
        </Alert>
      </motion.div>
    </div>
  );
}
