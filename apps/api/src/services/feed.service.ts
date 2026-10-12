import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { AuthContext } from "../tenant/context.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { authContextOrThrow } from "../middleware/rbac.js";
import { writeAudit } from "./audit.service.js";

const AUTHOR_SELECT = { id: true, firstName: true, lastName: true, avatarUrl: true } as const;

const POST_INCLUDE = {
  author: { select: AUTHOR_SELECT },
  _count: { select: { comments: true, reactions: true } },
  reactions: { select: { userId: true, emoji: true } },
} as const;

function isModerator(auth: AuthContext): boolean {
  return auth.role === "SUPER_ADMIN" || auth.role === "COMMUNITY_ADMIN";
}

type PostWithMeta = Prisma.CommunityPostGetPayload<{ include: typeof POST_INCLUDE }>;

function presentPost(post: PostWithMeta, userId: string) {
  const summary = new Map<string, number>();
  let myReaction: string | null = null;
  for (const reaction of post.reactions) {
    summary.set(reaction.emoji, (summary.get(reaction.emoji) ?? 0) + 1);
    if (reaction.userId === userId) myReaction = reaction.emoji;
  }
  const { reactions: _reactions, ...rest } = post;
  return {
    ...rest,
    reactions: Array.from(summary.entries()).map(([emoji, count]) => ({ emoji, count })),
    myReaction,
  };
}

async function findPostOrThrow(id: string, auth: AuthContext) {
  const where: Prisma.CommunityPostWhereInput = { id };
  if (!isModerator(auth)) where.status = "VISIBLE";
  const post = await prisma.communityPost.findFirst({ where });
  if (!post) throw AppError.notFound("We could not find that post.");
  return post;
}

export async function listPosts(query: {
  status?: "VISIBLE" | "HIDDEN" | "REMOVED";
  mine?: boolean;
  q?: string;
  page: number;
  limit: number;
}) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.CommunityPostWhereInput = {};
  if (isModerator(auth)) {
    if (query.status) where.status = query.status;
  } else {
    where.status = "VISIBLE";
  }
  if (query.mine) where.authorId = auth.userId;
  if (query.q) where.body = { contains: query.q, mode: "insensitive" };

  const [total, rows] = await Promise.all([
    prisma.communityPost.count({ where }),
    prisma.communityPost.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: POST_INCLUDE,
    }),
  ]);
  return { items: rows.map((post) => presentPost(post, auth.userId)), meta: paginationMeta(query.page, query.limit, total) };
}

export async function getPost(id: string) {
  const auth = authContextOrThrow();
  const post = await prisma.communityPost.findFirst({ where: { id }, include: POST_INCLUDE });
  if (!post) throw AppError.notFound("We could not find that post.");
  if (post.status !== "VISIBLE" && !isModerator(auth) && post.authorId !== auth.userId) {
    throw AppError.notFound("We could not find that post.");
  }

  const comments = await prisma.communityComment.findMany({
    where: { postId: id },
    orderBy: { createdAt: "asc" },
    include: { author: { select: AUTHOR_SELECT } },
  });

  return { post: presentPost(post, auth.userId), comments };
}

export async function createPost(body: string) {
  const auth = authContextOrThrow();
  const post = await prisma.communityPost.create({
    data: { communityId: "", authorId: auth.userId, body },
    include: POST_INCLUDE,
  });
  return presentPost(post, auth.userId);
}

export async function deletePost(id: string) {
  const auth = authContextOrThrow();
  const post = await findPostOrThrow(id, auth);
  if (!isModerator(auth) && post.authorId !== auth.userId) throw AppError.forbidden();
  await prisma.communityPost.delete({ where: { id } });
  await writeAudit({ action: "FEED.POST_DELETE", resource: "CommunityPost", resourceId: id });
  return { id };
}

export async function addComment(postId: string, body: string) {
  const auth = authContextOrThrow();
  const post = await findPostOrThrow(postId, auth);
  if (post.status !== "VISIBLE") throw AppError.conflict("This post is no longer open for comments.");
  const comment = await prisma.communityComment.create({
    data: { communityId: "", postId, authorId: auth.userId, body },
    include: { author: { select: AUTHOR_SELECT } },
  });
  return comment;
}

export async function deleteComment(id: string) {
  const auth = authContextOrThrow();
  const comment = await prisma.communityComment.findFirst({ where: { id } });
  if (!comment) throw AppError.notFound("We could not find that comment.");
  if (!isModerator(auth) && comment.authorId !== auth.userId) throw AppError.forbidden();
  await prisma.communityComment.delete({ where: { id } });
  return { id };
}

export async function reactToPost(postId: string, emoji: string) {
  const auth = authContextOrThrow();
  await findPostOrThrow(postId, auth);
  const existing = await prisma.communityReaction.findFirst({ where: { postId, userId: auth.userId } });
  if (existing && existing.emoji === emoji) {
    await prisma.communityReaction.delete({ where: { id: existing.id } });
    return { postId, emoji: null };
  }
  const reaction = await prisma.communityReaction.upsert({
    where: { postId_userId: { postId, userId: auth.userId } },
    create: { communityId: "", postId, userId: auth.userId, emoji },
    update: { emoji },
  });
  return { postId, emoji: reaction.emoji };
}

export async function reportPost(postId: string, reason?: string) {
  const auth = authContextOrThrow();
  await findPostOrThrow(postId, auth);
  const existing = await prisma.postReport.findFirst({ where: { postId, reporterId: auth.userId } });
  if (!existing) {
    await prisma.postReport.create({
      data: { communityId: "", postId, reporterId: auth.userId, reason },
    });
    await prisma.communityPost.update({ where: { id: postId }, data: { reportedCount: { increment: 1 } } });
  }
  return { postId, reported: true };
}

export async function listReports(query: {
  status?: "OPEN" | "RESOLVED" | "DISMISSED";
  page: number;
  limit: number;
}) {
  authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.PostReportWhereInput = {};
  if (query.status) where.status = query.status;
  const [total, items] = await Promise.all([
    prisma.postReport.count({ where }),
    prisma.postReport.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: AUTHOR_SELECT },
        post: {
          include: {
            author: { select: AUTHOR_SELECT },
            _count: { select: { comments: true, reactions: true } },
          },
        },
      },
    }),
  ]);
  return { items, meta: paginationMeta(query.page, query.limit, total) };
}

export async function resolveReport(id: string, status: "OPEN" | "RESOLVED" | "DISMISSED") {
  const report = await prisma.postReport.findFirst({ where: { id } });
  if (!report) throw AppError.notFound("We could not find that report.");
  const updated = await prisma.postReport.update({ where: { id }, data: { status } });
  await writeAudit({ action: "FEED.REPORT_RESOLVE", resource: "PostReport", resourceId: id, meta: { status } });
  return updated;
}

export async function moderatePost(
  id: string,
  input: { status: "VISIBLE" | "HIDDEN" | "REMOVED"; reason?: string },
) {
  const post = await prisma.communityPost.findFirst({ where: { id } });
  if (!post) throw AppError.notFound("We could not find that post.");
  const updated = await prisma.communityPost.update({
    where: { id },
    data: {
      status: input.status,
      hiddenReason: input.status === "VISIBLE" ? null : (input.reason ?? post.hiddenReason),
    },
    include: POST_INCLUDE,
  });
  await writeAudit({
    action: "FEED.MODERATE",
    resource: "CommunityPost",
    resourceId: id,
    meta: { status: input.status },
  });
  const auth = authContextOrThrow();
  return presentPost(updated, auth.userId);
}
