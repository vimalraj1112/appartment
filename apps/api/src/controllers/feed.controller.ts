import type { Request, Response } from "express";
import * as feedService from "../services/feed.service.js";
import { ok } from "../utils/respond.js";

export async function listPosts(req: Request, res: Response): Promise<void> {
  const result = await feedService.listPosts(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function getPost(req: Request, res: Response): Promise<void> {
  ok(res, await feedService.getPost(req.params.id as string));
}

export async function createPost(req: Request, res: Response): Promise<void> {
  const { body } = req.body as { body: string };
  ok(res, await feedService.createPost(body));
}

export async function deletePost(req: Request, res: Response): Promise<void> {
  ok(res, await feedService.deletePost(req.params.id as string));
}

export async function addComment(req: Request, res: Response): Promise<void> {
  const { body } = req.body as { body: string };
  ok(res, await feedService.addComment(req.params.id as string, body));
}

export async function deleteComment(req: Request, res: Response): Promise<void> {
  ok(res, await feedService.deleteComment(req.params.id as string));
}

export async function reactPost(req: Request, res: Response): Promise<void> {
  const { emoji } = req.body as { emoji: string };
  ok(res, await feedService.reactToPost(req.params.id as string, emoji));
}

export async function reportPost(req: Request, res: Response): Promise<void> {
  const { reason } = req.body as { reason?: string };
  ok(res, await feedService.reportPost(req.params.id as string, reason));
}

export async function listReports(req: Request, res: Response): Promise<void> {
  const result = await feedService.listReports(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function resolveReport(req: Request, res: Response): Promise<void> {
  const { status } = req.body as { status: "OPEN" | "RESOLVED" | "DISMISSED" };
  ok(res, await feedService.resolveReport(req.params.id as string, status));
}

export async function moderatePost(req: Request, res: Response): Promise<void> {
  ok(res, await feedService.moderatePost(req.params.id as string, req.body as never));
}
