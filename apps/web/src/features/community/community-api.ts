import type { AnnouncementStatus, AnnouncementType, PostReportStatus, PostStatus } from "@superlink/shared";
import { apiRequest, apiRequestPage, type Page } from "../../lib/api";

export interface FeedAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
}

export interface Announcement {
  id: string;
  authorId: string;
  type: AnnouncementType;
  title: string;
  body: string;
  status: AnnouncementStatus;
  publishAt: string;
  pinnedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  author: FeedAuthor;
  _count: { acks: number };
}

export interface AnnouncementDetail {
  announcement: Announcement;
  myAck: boolean;
  ackCount: number;
  acks: Array<{ id: string; user: { id: string; firstName: string; lastName: string } }>;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  body: string;
  status: PostStatus;
  hiddenReason: string | null;
  reportedCount: number;
  createdAt: string;
  updatedAt: string;
  author: FeedAuthor;
  _count: { comments: number; reactions: number };
  reactions: ReactionSummary[];
  myReaction: string | null;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: FeedAuthor;
}

export interface PostReport {
  id: string;
  postId: string;
  reporterId: string;
  reason: string | null;
  status: PostReportStatus;
  createdAt: string;
  reporter: FeedAuthor;
  post: CommunityPost;
}

// Announcements
export function listAnnouncements(params: {
  type?: AnnouncementType;
  status?: AnnouncementStatus;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Page<Announcement>> {
  const search = new URLSearchParams();
  if (params.type) search.set("type", params.type);
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<Announcement>(`/announcements?${search.toString()}`);
}

export function getAnnouncement(id: string): Promise<AnnouncementDetail> {
  return apiRequest<AnnouncementDetail>(`/announcements/${id}`);
}

export function createAnnouncement(input: {
  type: AnnouncementType;
  title: string;
  body: string;
  status: AnnouncementStatus;
  publishAt?: string;
  pinnedUntil?: string | null;
}): Promise<Announcement> {
  return apiRequest<Announcement>("/announcements", { method: "POST", body: input });
}

export function updateAnnouncement(
  id: string,
  input: Partial<{
    type: AnnouncementType;
    title: string;
    body: string;
    status: AnnouncementStatus;
    publishAt: string;
    pinnedUntil: string | null;
  }>,
): Promise<Announcement> {
  return apiRequest<Announcement>(`/announcements/${id}`, { method: "PATCH", body: input });
}

export function deleteAnnouncement(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/announcements/${id}`, { method: "DELETE" });
}

export function acknowledgeAnnouncement(id: string): Promise<{ announcementId: string; acknowledgedAt: string }> {
  return apiRequest(`/announcements/${id}/ack`, { method: "POST" });
}

// Community feed
export function listPosts(params: {
  status?: PostStatus;
  mine?: boolean;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Page<CommunityPost>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.mine) search.set("mine", "true");
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page));
  search.set("limit", String(params.limit ?? 20));
  return apiRequestPage<CommunityPost>(`/feed/posts?${search.toString()}`);
}

export function getPost(id: string): Promise<{ post: CommunityPost; comments: CommunityComment[] }> {
  return apiRequest<{ post: CommunityPost; comments: CommunityComment[] }>(`/feed/posts/${id}`);
}

export function createPost(body: string): Promise<CommunityPost> {
  return apiRequest<CommunityPost>("/feed/posts", { method: "POST", body: { body } });
}

export function deletePost(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/feed/posts/${id}`, { method: "DELETE" });
}

export function addComment(postId: string, body: string): Promise<CommunityComment> {
  return apiRequest<CommunityComment>(`/feed/posts/${postId}/comments`, { method: "POST", body: { body } });
}

export function deleteComment(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/feed/comments/${id}`, { method: "DELETE" });
}

export function reactToPost(postId: string, emoji: string): Promise<{ postId: string; emoji: string | null }> {
  return apiRequest(`/feed/posts/${postId}/reactions`, { method: "POST", body: { emoji } });
}

export function reportPost(postId: string, reason?: string): Promise<{ postId: string; reported: boolean }> {
  return apiRequest(`/api/v1/feed/posts/${postId}/reports`.replace("/api/v1", ""), {
    method: "POST",
    body: { reason },
  });
}

export function listReports(params: {
  status?: PostReportStatus;
  page?: number;
  limit?: number;
} = {}): Promise<Page<PostReport>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));
  return apiRequestPage<PostReport>(`/feed/reports?${search.toString()}`);
}

export function resolveReport(id: string, status: PostReportStatus): Promise<PostReport> {
  return apiRequest<PostReport>(`/feed/reports/${id}`, { method: "PATCH", body: { status } });
}

export function moderatePost(
  id: string,
  input: { status: PostStatus; reason?: string },
): Promise<CommunityPost> {
  return apiRequest<CommunityPost>(`/feed/posts/${id}/moderation`, {
    method: "PATCH",
    body: input,
  });
}
