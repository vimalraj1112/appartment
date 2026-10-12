import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listComplaints, updateComplaint } from "../features/complaints/complaint-api";
import {
  ComplaintPriorityBadge,
  ComplaintStatusBadge,
  formatDateTime,
} from "../features/complaints/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

export function StaffTasksPage() {
  const queryClient = useQueryClient();
  const tasks = useQuery({
    queryKey: ["complaints", "tasks"],
    queryFn: () => listComplaints({ limit: 50 }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "IN_PROGRESS" | "RESOLVED" }) =>
      updateComplaint(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["complaints"] }),
  });

  const rows = tasks.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="My tasks" subtitle="Complaints assigned to you." />

      {tasks.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <Alert>No complaints are assigned to you right now.</Alert>
      ) : (
        <div className="space-y-3">
          {rows.map((complaint) => (
            <Card key={complaint.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
                <div className="min-w-0 space-y-1">
                  <Link to={`/app/complaints/${complaint.id}`} className="font-medium hover:underline">
                    {complaint.title}
                  </Link>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {complaint.flat?.code ?? "—"} · {complaint.category?.name ?? "Uncategorised"} ·{" "}
                    {formatDateTime(complaint.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ComplaintPriorityBadge priority={complaint.priority} />
                  <ComplaintStatusBadge status={complaint.status} />
                  {complaint.status !== "RESOLVED" && complaint.status !== "CLOSED" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={setStatus.isPending}
                        onClick={() => setStatus.mutate({ id: complaint.id, status: "IN_PROGRESS" })}
                      >
                        Start
                      </Button>
                      <Button
                        size="sm"
                        loading={setStatus.isPending}
                        onClick={() => setStatus.mutate({ id: complaint.id, status: "RESOLVED" })}
                      >
                        Resolve
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
