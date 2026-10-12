import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  getPost,
  listPosts,
  reactToPost,
  reportPost,
} from "../features/community/community-api";
import { REACTION_EMOJIS, authorName } from "../features/community/components";
import { useAuth } from "../features/auth/auth-context";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";
import { cn } from "../lib/cn";

export function ResidentFeedPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  const posts = useQuery({ queryKey: ["feed", "posts"], queryFn: () => listPosts() });

  const detail = useQuery({
    queryKey: ["feed", "post", openPostId],
    queryFn: () => getPost(openPostId as string),
    enabled: Boolean(openPostId),
  });

  const invalidatePosts = () => queryClient.invalidateQueries({ queryKey: ["feed", "posts"] });

  const create = useMutation({
    mutationFn: () => createPost(draft.trim()),
    onSuccess: () => {
      setDraft("");
      invalidatePosts();
    },
  });
  const removePost = useMutation({ mutationFn: (id: string) => deletePost(id), onSuccess: invalidatePosts });
  const react = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => reactToPost(id, emoji),
    onSuccess: invalidatePosts,
  });
  const report = useMutation({ mutationFn: (id: string) => reportPost(id, "Reported from feed") });
  const comment = useMutation({
    mutationFn: () => addComment(openPostId as string, commentDraft.trim()),
    onSuccess: () => {
      setCommentDraft("");
      queryClient.invalidateQueries({ queryKey: ["feed", "post", openPostId] });
      invalidatePosts();
    },
  });
  const removeComment = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed", "post", openPostId] });
      invalidatePosts();
    },
  });

  const items = posts.data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Community" subtitle="Share updates and stay in touch with your neighbours." />

      <Card>
        <CardContent className="space-y-3 p-5">
          {create.isError && <Alert variant="destructive">{create.error.message}</Alert>}
          <textarea
            className="min-h-24 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            placeholder="Share something with your community…"
            value={draft}
            maxLength={2000}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="flex justify-end">
            <Button loading={create.isPending} disabled={draft.trim().length === 0} onClick={() => create.mutate()}>
              Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {posts.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <Alert>No posts yet. Be the first to share something.</Alert>
      ) : (
        <div className="space-y-3">
          {items.map((post) => {
            const mine = post.authorId === user?.id;
            const open = openPostId === post.id;
            return (
              <Card key={post.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {authorName(post.author)}
                        {mine && <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">You</span>}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {new Date(post.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    {mine && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={removePost.isPending}
                        onClick={() => removePost.mutate(post.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap text-sm">{post.body}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    {REACTION_EMOJIS.map((emoji) => {
                      const count = post.reactions.find((entry) => entry.emoji === emoji)?.count ?? 0;
                      const active = post.myReaction === emoji;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => react.mutate({ id: post.id, emoji })}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs transition-colors",
                            active
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                              : "border-[var(--color-border)] hover:bg-[var(--color-muted)]/50",
                          )}
                        >
                          {emoji} {count > 0 ? count : ""}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs hover:bg-[var(--color-muted)]/50"
                      onClick={() => {
                        setOpenPostId(open ? null : post.id);
                        setCommentDraft("");
                      }}
                    >
                      {post._count.comments} comments
                    </button>
                    {!mine && (
                      <button
                        type="button"
                        className="ml-auto text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                        onClick={() => report.mutate(post.id)}
                      >
                        Report
                      </button>
                    )}
                  </div>

                  {open && (
                    <div className="space-y-3 border-t border-[var(--color-border)] pt-3">
                      {detail.isLoading ? (
                        <div className="flex justify-center py-4">
                          <Spinner className="h-4 w-4" />
                        </div>
                      ) : (
                        <>
                          {(detail.data?.comments ?? []).map((entry) => (
                            <div key={entry.id} className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-medium">{authorName(entry.author)}</p>
                                <p className="text-sm">{entry.body}</p>
                              </div>
                              {(entry.authorId === user?.id || mine) && (
                                <button
                                  type="button"
                                  className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                                  onClick={() => removeComment.mutate(entry.id)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          <div className="flex items-center gap-2">
                            <Input
                              value={commentDraft}
                              placeholder="Write a comment…"
                              onChange={(event) => setCommentDraft(event.target.value)}
                            />
                            <Button
                              size="sm"
                              loading={comment.isPending}
                              disabled={commentDraft.trim().length === 0}
                              onClick={() => comment.mutate()}
                            >
                              Send
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
