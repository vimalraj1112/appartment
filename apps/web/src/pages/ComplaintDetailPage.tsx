import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ComplaintStatus } from "@superlink/shared";
import { Link, useParams } from "react-router-dom";
import {
  addComment,
  assignComplaint,
  getComplaint,
  rateComplaint,
  updateComplaint,
} from "../features/complaints/complaint-api";
import {
  ComplaintPriorityBadge,
  ComplaintStatusBadge,
  formatDateTime,
} from "../features/complaints/components";
import { listStaffProfiles } from "../features/staff/staff-api";
import { useAuth } from "../features/auth/auth-context";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

const STATUSES: ComplaintStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export function ComplaintDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role ?? "";
  const isAdmin = role === "COMMUNITY_ADMIN" || role === "SUPER_ADMIN";
  const isStaff = role === "STAFF";

  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [assignee, setAssignee] = useState("");

  const detail = useQuery({
    queryKey: ["complaints", "detail", id],
    queryFn: () => getComplaint(id),
    enabled: Boolean(id),
  });
  const staff = useQuery({
    queryKey: ["staff", "profiles", "assign"],
    queryFn: () => listStaffProfiles({ limit: 100 }),
    enabled: isAdmin,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["complaints"] });

  const commentMutation = useMutation({
    mutationFn: () => addComment(id, { body: comment.trim(), isInternal: internal }),
    onSuccess: () => {
      setComment("");
      setInternal(false);
      void invalidate();
    },
  });
  const statusMutation = useMutation({
    mutationFn: (status: ComplaintStatus) => updateComplaint(id, { status }),
    onSuccess: invalidate,
  });
  const assignMutation = useMutation({
    mutationFn: () => assignComplaint(id, { staffUserId: assignee }),
    onSuccess: () => {
      setAssignee("");
      void invalidate();
    },
  });
  const rateMutation = useMutation({
    mutationFn: (rating: number) => rateComplaint(id, rating),
    onSuccess: invalidate,
  });

  if (detail.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    return <Alert variant="destructive">We could not load that complaint.</Alert>;
  }

  const { complaint, comments, assignments } = detail.data;
  const canRate =
    complaint.raisedBy.id === user?.id &&
    (complaint.status === "RESOLVED" || complaint.status === "CLOSED") &&
    complaint.rating === null;
  const backTo = isAdmin ? "/admin/complaints" : isStaff ? "/app/tasks" : "/app/complaints";

  return (
    <div className="space-y-6">
      <PageHeader
        title={complaint.title}
        subtitle={`Raised ${formatDateTime(complaint.createdAt)} by ${complaint.raisedBy.firstName} ${complaint.raisedBy.lastName}`}
        actions={
          <Link to={backTo}>
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <ComplaintPriorityBadge priority={complaint.priority} />
            <ComplaintStatusBadge status={complaint.status} />
            {complaint.category && <span className="text-xs text-[var(--color-muted-foreground)]">{complaint.category.name}</span>}
            {complaint.flat && (
              <span className="text-xs text-[var(--color-muted-foreground)]">Flat {complaint.flat.code}</span>
            )}
            {complaint.location && (
              <span className="text-xs text-[var(--color-muted-foreground)]">· {complaint.location}</span>
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm">{complaint.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted-foreground)]">
            <span>Raised by {complaint.raisedBy.firstName} {complaint.raisedBy.lastName}</span>
            <span>
              Assigned to{" "}
              {complaint.assignedTo
                ? `${complaint.assignedTo.firstName} ${complaint.assignedTo.lastName}`
                : "nobody yet"}
            </span>
            {complaint.rating !== null && <span>Rating: {"★".repeat(complaint.rating)}</span>}
          </div>
        </CardContent>
      </Card>

      {(isAdmin || isStaff) && (
        <Card>
          <CardHeader>
            <CardTitle>Manage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={complaint.status}
                className="min-w-[10rem]"
                disabled={statusMutation.isPending}
                onChange={(event) => statusMutation.mutate(event.target.value as ComplaintStatus)}
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
            {isAdmin && (
              <form
                className="flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (assignee) assignMutation.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label>Assign to</Label>
                  <Select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                    <option value="">Select staff</option>
                    {staff.data?.data.map((profile) => (
                      <option key={profile.id} value={profile.user.id}>
                        {profile.user.firstName} {profile.user.lastName} · {profile.trade}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" loading={assignMutation.isPending} disabled={!assignee}>
                  Assign
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Discussion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No comments yet.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((item) => (
                <li key={item.id} className="rounded-md border border-[var(--color-border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {item.author.firstName} {item.author.lastName}
                    </p>
                    <div className="flex items-center gap-2">
                      {item.isInternal && (
                        <span className="rounded bg-[var(--color-muted)] px-2 py-0.5 text-[10px] uppercase text-[var(--color-muted-foreground)]">
                          Internal
                        </span>
                      )}
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{item.body}</p>
                </li>
              ))}
            </ul>
          )}

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (comment.trim()) commentMutation.mutate();
            }}
          >
            <textarea
              rows={3}
              required
              value={comment}
              placeholder="Write a comment…"
              onChange={(event) => setComment(event.target.value)}
              className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            />
            <div className="flex items-center justify-between">
              {(isAdmin || isStaff) && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(event) => setInternal(event.target.checked)}
                  />
                  Internal note
                </label>
              )}
              <Button type="submit" loading={commentMutation.isPending}>
                Post comment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {assignments.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span>
                    {item.staff.firstName} {item.staff.lastName}
                    {item.note ? ` · ${item.note}` : ""}
                  </span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {formatDateTime(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {canRate && (
        <Card>
          <CardHeader>
            <CardTitle>Rate the resolution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <Button
                key={value}
                size="sm"
                variant="outline"
                loading={rateMutation.isPending}
                onClick={() => rateMutation.mutate(value)}
              >
                {value}★
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
