import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PostReportStatus, PostStatus } from "@superlink/shared";
import { listPosts, listReports, moderatePost, resolveReport } from "../features/community/community-api";
import { authorName, PostStatusBadge, ReportStatusBadge } from "../features/community/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

const POST_STATUSES: PostStatus[] = ["VISIBLE", "HIDDEN", "REMOVED"];
const REPORT_STATUSES: PostReportStatus[] = ["OPEN", "RESOLVED", "DISMISSED"];

export function AdminCommunityPage() {
  const queryClient = useQueryClient();
  const [postStatus, setPostStatus] = useState<PostStatus | "">("");
  const [reportStatus, setReportStatus] = useState<PostReportStatus | "">("OPEN");

  const posts = useQuery({
    queryKey: ["feed", "admin", "posts", postStatus],
    queryFn: () => listPosts({ status: postStatus || undefined }),
  });
  const reports = useQuery({
    queryKey: ["feed", "admin", "reports", reportStatus],
    queryFn: () => listReports({ status: reportStatus || undefined }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["feed", "admin"] });
  };

  const moderate = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: PostStatus; reason?: string }) =>
      moderatePost(id, { status, reason }),
    onSuccess: invalidate,
  });
  const resolve = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PostReportStatus }) => resolveReport(id, status),
    onSuccess: invalidate,
  });

  const postItems = posts.data?.data ?? [];
  const reportItems = reports.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Community moderation" subtitle="Review reported posts and keep the feed healthy." />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold">Posts</h2>
          <div className="w-44">
            <Select value={postStatus} onChange={(event) => setPostStatus(event.target.value as PostStatus | "")}>
              <option value="">All statuses</option>
              {POST_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {posts.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        ) : postItems.length === 0 ? (
          <Alert>No posts found.</Alert>
        ) : (
          <div className="space-y-3">
            {postItems.map((post) => (
              <Card key={post.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{authorName(post.author)}</p>
                    <div className="flex items-center gap-2">
                      <PostStatusBadge status={post.status} />
                      {post.reportedCount > 0 && (
                        <span className="text-xs text-[var(--color-destructive)]">
                          {post.reportedCount} report(s)
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{post.body}</p>
                  <div className="flex flex-wrap gap-2">
                    {post.status !== "VISIBLE" && (
                      <Button
                        size="sm"
                        loading={moderate.isPending}
                        onClick={() => moderate.mutate({ id: post.id, status: "VISIBLE" })}
                      >
                        Restore
                      </Button>
                    )}
                    {post.status !== "HIDDEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moderate.mutate({ id: post.id, status: "HIDDEN", reason: "Hidden by admin" })}
                      >
                        Hide
                      </Button>
                    )}
                    {post.status !== "REMOVED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moderate.mutate({ id: post.id, status: "REMOVED", reason: "Removed by admin" })}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold">Reports</h2>
          <div className="w-44">
            <Select
              value={reportStatus}
              onChange={(event) => setReportStatus(event.target.value as PostReportStatus | "")}
            >
              <option value="">All statuses</option>
              {REPORT_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {reports.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        ) : reportItems.length === 0 ? (
          <Alert>No reports found.</Alert>
        ) : (
          <div className="space-y-3">
            {reportItems.map((report) => (
              <Card key={report.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">
                      <span className="font-medium">{authorName(report.reporter)}</span> reported a post
                    </p>
                    <ReportStatusBadge status={report.status} />
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-muted-foreground)]">
                    {report.reason || "No reason provided"}
                  </p>
                  <p className="rounded-md bg-[var(--color-muted)]/40 p-3 text-sm">{report.post.body}</p>
                  {report.status === "OPEN" && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        loading={resolve.isPending}
                        onClick={() => resolve.mutate({ id: report.id, status: "RESOLVED" })}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolve.mutate({ id: report.id, status: "DISMISSED" })}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
