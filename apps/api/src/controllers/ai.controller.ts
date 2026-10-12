import type { Request, Response } from "express";
import * as aiService from "../services/ai.service.js";
import { ok } from "../utils/respond.js";

export async function createConversation(req: Request, res: Response): Promise<void> {
  ok(res, await aiService.createConversation(req.body as { title?: string }));
}

export async function listConversations(_req: Request, res: Response): Promise<void> {
  ok(res, await aiService.listConversations());
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  ok(res, await aiService.getConversation(req.params.id as string));
}

export async function deleteConversation(req: Request, res: Response): Promise<void> {
  ok(res, await aiService.deleteConversation(req.params.id as string));
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const { content } = req.body as { content: string };
  ok(res, await aiService.sendMessage(req.params.id as string, content));
}

export async function listTools(_req: Request, res: Response): Promise<void> {
  ok(res, aiService.listTools());
}

export async function digest(_req: Request, res: Response): Promise<void> {
  ok(res, await aiService.getDigest());
}
