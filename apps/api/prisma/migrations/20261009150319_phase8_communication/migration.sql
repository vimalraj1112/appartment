-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('GENERAL', 'URGENT', 'MAINTENANCE', 'EVENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "PostReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'PUBLISHED',
    "pinnedUntil" TIMESTAMP(3),
    "publishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementAck" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "announcementId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementAck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'VISIBLE',
    "hiddenReason" TEXT,
    "reportedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReaction" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostReport" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "reason" TEXT,
    "status" "PostReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_communityId_idx" ON "Announcement"("communityId");

-- CreateIndex
CREATE INDEX "Announcement_communityId_status_publishAt_idx" ON "Announcement"("communityId", "status", "publishAt");

-- CreateIndex
CREATE INDEX "AnnouncementAck_communityId_idx" ON "AnnouncementAck"("communityId");

-- CreateIndex
CREATE INDEX "AnnouncementAck_userId_idx" ON "AnnouncementAck"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementAck_announcementId_userId_key" ON "AnnouncementAck"("announcementId", "userId");

-- CreateIndex
CREATE INDEX "CommunityPost_communityId_idx" ON "CommunityPost"("communityId");

-- CreateIndex
CREATE INDEX "CommunityPost_communityId_status_createdAt_idx" ON "CommunityPost"("communityId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_authorId_idx" ON "CommunityPost"("authorId");

-- CreateIndex
CREATE INDEX "CommunityComment_communityId_idx" ON "CommunityComment"("communityId");

-- CreateIndex
CREATE INDEX "CommunityComment_postId_idx" ON "CommunityComment"("postId");

-- CreateIndex
CREATE INDEX "CommunityReaction_communityId_idx" ON "CommunityReaction"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReaction_postId_userId_key" ON "CommunityReaction"("postId", "userId");

-- CreateIndex
CREATE INDEX "PostReport_communityId_idx" ON "PostReport"("communityId");

-- CreateIndex
CREATE INDEX "PostReport_communityId_status_idx" ON "PostReport"("communityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PostReport_postId_reporterId_key" ON "PostReport"("postId", "reporterId");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementAck" ADD CONSTRAINT "AnnouncementAck_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementAck" ADD CONSTRAINT "AnnouncementAck_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementAck" ADD CONSTRAINT "AnnouncementAck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReport" ADD CONSTRAINT "PostReport_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReport" ADD CONSTRAINT "PostReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReport" ADD CONSTRAINT "PostReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
