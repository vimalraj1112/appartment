import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ComplaintPriority, ComplaintStatus } from "@superlink/shared";
import { Link } from "react-router-dom";
import {
  createCategory,
  listCategories,
  listComplaints,
} from "../features/complaints/complaint-api";
import {
  ComplaintPriorityBadge,
  ComplaintStatusBadge,
  formatDateTime,
} from "../features/complaints/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";

const STATUSES: ComplaintStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITIES: ComplaintPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function AdminComplaintsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ComplaintStatus | "">("");
  const [priority, setPriority] = useState<ComplaintPriority | "">("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");

  const complaints = useQuery({
    queryKey: ["complaints", "admin", status, priority, q],
    queryFn: () =>
      listComplaints({
        status: status || undefined,
        priority: priority || undefined,
        q: q || undefined,
        limit: 50,
      }),
  });
  const categories = useQuery({ queryKey: ["complaints", "categories", "all"], queryFn: () => listCategories() });

  const addCategory = useMutation({
    mutationFn: () => createCategory({ name: category.trim() }),
    onSuccess: () => {
      setCategory("");
      void queryClient.invalidateQueries({ queryKey: ["complaints", "categories"] });
    },
  });

  const rows = complaints.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Complaints" subtitle="Track, assign and resolve resident complaints." />

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-6">
          <Input
            placeholder="Search title or description"
            value={q}
            className="max-w-xs"
            onChange={(event) => setQ(event.target.value)}
          />
          <Select
            value={status}
            className="max-w-[12rem]"
            onChange={(event) => setStatus(event.target.value as ComplaintStatus | "")}
          >
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replace("_", " ")}
              </option>
            ))}
          </Select>
          <Select
            value={priority}
            className="max-w-[10rem]"
            onChange={(event) => setPriority(event.target.value as ComplaintPriority | "")}
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {complaints.isLoading ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>
      ) : rows.length === 0 ? (
        <Alert>No complaints match.</Alert>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
          {rows.map((complaint) => (
            <li key={complaint.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link to={`/admin/complaints/${complaint.id}`} className="font-medium hover:underline">
                  {complaint.title}
                </Link>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {complaint.flat?.code ?? "—"} · {complaint.category?.name ?? "Uncategorised"} ·{" "}
                  {complaint.raisedBy.firstName} {complaint.raisedBy.lastName} ·{" "}
                  {formatDateTime(complaint.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ComplaintPriorityBadge priority={complaint.priority} />
                <ComplaintStatusBadge status={complaint.status} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (category.trim()) addCategory.mutate();
            }}
          >
            <Input
              placeholder="New category name"
              value={category}
              className="max-w-xs"
              onChange={(event) => setCategory(event.target.value)}
            />
            <Button type="submit" loading={addCategory.isPending}>
              Add category
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {(categories.data ?? []).map((item) => (
              <span
                key={item.id}
                className="rounded-full bg-[var(--color-muted)] px-3 py-1 text-xs text-[var(--color-muted-foreground)]"
              >
                {item.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
