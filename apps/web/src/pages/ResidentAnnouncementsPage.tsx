import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnnouncementType } from "@superlink/shared";
import { acknowledgeAnnouncement, getAnnouncement, listAnnouncements } from "../features/community/community-api";
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

export function ResidentAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<AnnouncementType | "">("");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const announcements = useQuery({
    queryKey: ["announcements", "resident", type, q],
    queryFn: () => listAnnouncements({ type: type || undefined, q: q || undefined }),
  });

  const detail = useQuery({
    queryKey: ["announcements", "detail", selectedId],
    queryFn: () => getAnnouncement(selectedId as string),
    enabled: Boolean(selectedId),
  });

  const ack = useMutation({
    mutationFn: (id: string) => acknowledgeAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", "detail", selectedId] });
    },
  });

  const items = announcements.data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Announcements" subtitle="Notices and updates from your community management." />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="type">Category</Label>
          <Select
            id="type"
            value={type}
            onChange={(event) => setType(event.target.value as AnnouncementType | "")}
          >
            <option value="">All categories</option>
            {TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q">Search</Label>
          <Input id="q" value={q} placeholder="Search by title" onChange={(event) => setQ(event.target.value)} />
        </div>
      </div>

      {selectedId && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>{detail.data?.announcement.title ?? "Loading…"}</CardTitle>
              {detail.data && (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {authorName(detail.data.announcement.author)} ·{" "}
                  {formatDateTime(detail.data.announcement.publishAt)}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.isLoading ? (
              <div className="flex justify-center py-6">
                <Spinner className="h-5 w-5" />
              </div>
            ) : detail.data ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <AnnouncementTypeBadge type={detail.data.announcement.type} />
                  <AnnouncementStatusBadge status={detail.data.announcement.status} />
                </div>
                <p className="whitespace-pre-wrap text-sm">{detail.data.announcement.body}</p>
                <div className="flex items-center gap-3">
                  {ack.isError && <Alert variant="destructive">{ack.error.message}</Alert>}
                  {detail.data.myAck ? (
                    <span className="text-sm text-[var(--color-success)]">Acknowledged</span>
                  ) : (
                    <Button
                      size="sm"
                      loading={ack.isPending}
                      onClick={() => ack.mutate(detail.data.announcement.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {detail.data.ackCount} acknowledged
                  </span>
                </div>
              </>
            ) : (
              <Alert variant="destructive">This announcement is no longer available.</Alert>
            )}
          </CardContent>
        </Card>
      )}

      {announcements.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <Alert>No announcements to show.</Alert>
      ) : (
        <div className="space-y-3">
          {items.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <AnnouncementTypeBadge type={announcement.type} />
                    <p className="font-medium">{announcement.title}</p>
                  </div>
                  <p className="line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{announcement.body}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {authorName(announcement.author)} · {formatDateTime(announcement.publishAt)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelectedId(announcement.id)}>
                  View
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
