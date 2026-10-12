import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnnouncementStatus, AnnouncementType } from "@superlink/shared";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from "../features/community/community-api";
import {
  AnnouncementStatusBadge,
  AnnouncementTypeBadge,
  authorName,
  formatDateTime,
} from "../features/community/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

const TYPES: AnnouncementType[] = ["GENERAL", "URGENT", "MAINTENANCE", "EVENT", "EMERGENCY"];
const STATUSES: AnnouncementStatus[] = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"];

const EMPTY = {
  type: "GENERAL" as AnnouncementType,
  title: "",
  body: "",
  status: "PUBLISHED" as AnnouncementStatus,
};

export function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | "">("");

  const announcements = useQuery({
    queryKey: ["announcements", "admin", statusFilter],
    queryFn: () => listAnnouncements({ status: statusFilter || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["announcements"] });

  const create = useMutation({
    mutationFn: () => createAnnouncement(form),
    onSuccess: () => {
      setForm(EMPTY);
      invalidate();
    },
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AnnouncementStatus }) =>
      updateAnnouncement(id, { status }),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteAnnouncement(id), onSuccess: invalidate });

  const items = announcements.data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Announcements" subtitle="Publish notices and track acknowledgements." />

      <Card>
        <CardHeader>
          <CardTitle>New announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
          >
            {create.isError && <Alert variant="destructive">{create.error.message}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="type">Category</Label>
                <Select
                  id="type"
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value as AnnouncementType })}
                >
                  {TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value as AnnouncementStatus })}
                >
                  {STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Message</Label>
              <textarea
                id="body"
                required
                className="min-h-24 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
              />
            </div>
            <Button type="submit" loading={create.isPending}>
              Save announcement
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-end justify-between gap-3">
        <h2 className="text-sm font-semibold">All announcements</h2>
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as AnnouncementStatus | "")}
          >
            <option value="">All statuses</option>
            {STATUSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {announcements.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <Alert>No announcements yet.</Alert>
      ) : (
        <div className="space-y-3">
          {items.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <AnnouncementTypeBadge type={announcement.type} />
                  <AnnouncementStatusBadge status={announcement.status} />
                  <p className="font-medium">{announcement.title}</p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-[var(--color-muted-foreground)]">
                  {announcement.body}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {authorName(announcement.author)} · {formatDateTime(announcement.publishAt)} ·{" "}
                  {announcement._count.acks} acknowledged
                </p>
                <div className="flex flex-wrap gap-2">
                  {announcement.status !== "PUBLISHED" && (
                    <Button
                      size="sm"
                      loading={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: announcement.id, status: "PUBLISHED" })}
                    >
                      Publish
                    </Button>
                  )}
                  {announcement.status === "PUBLISHED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus.mutate({ id: announcement.id, status: "ARCHIVED" })}
                    >
                      Archive
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    loading={remove.isPending}
                    onClick={() => remove.mutate(announcement.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
