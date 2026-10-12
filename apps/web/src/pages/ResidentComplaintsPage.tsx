import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listComplaints } from "../features/complaints/complaint-api";
import {
  ComplaintPriorityBadge,
  ComplaintStatusBadge,
  formatDateTime,
} from "../features/complaints/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

export function ResidentComplaintsPage() {
  const complaints = useQuery({
    queryKey: ["complaints", "list"],
    queryFn: () => listComplaints({ limit: 50 }),
  });

  const rows = complaints.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaints"
        subtitle="Raise an issue and follow how it is resolved."
        actions={
          <Link to="/app/complaints/new">
            <Button size="sm">
              <Icon name="plus" className="h-4 w-4" />
              New complaint
            </Button>
          </Link>
        }
      />

      {complaints.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <Alert>You have not raised any complaints yet.</Alert>
      ) : (
        <div className="space-y-3">
          {rows.map((complaint) => (
            <Link key={complaint.id} to={`/app/complaints/${complaint.id}`} className="block">
              <Card className="transition-colors hover:bg-[var(--color-muted)]/40">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{complaint.title}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {complaint.category?.name ?? "Uncategorised"} ·{" "}
                      {complaint.flat?.code ?? "—"} · {formatDateTime(complaint.createdAt)}
                    </p>
                    {complaint.assignedTo && (
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Assigned to {complaint.assignedTo.firstName} {complaint.assignedTo.lastName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ComplaintPriorityBadge priority={complaint.priority} />
                    <ComplaintStatusBadge status={complaint.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
