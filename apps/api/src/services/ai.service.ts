import type { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { prisma } from "../config/prisma.js";
import { authContextOrThrow } from "../middleware/rbac.js";
import type { AuthContext } from "../tenant/context.js";
import { getLlmProvider } from "./llm.provider.js";
import { findTool, toDefinition, toolsForRole, type AiToolResult } from "./ai.tools.js";
import { getOverview } from "./report.service.js";

const DEFAULT_TITLE = "New chat";
const HISTORY_LIMIT = 12;
const MAX_TOOL_CALLS = 3;

function systemPrompt(auth: AuthContext): string {
  const tiers: string[] = ["help content"];
  if (auth.role === "COMMUNITY_ADMIN" || auth.role === "SUPER_ADMIN") tiers.push("community statistics");
  if (auth.role === "RESIDENT") tiers.push("their own bills, visitors, bookings and complaints");
  return (
    "You are the SuperLink community assistant. You can only READ data by calling the provided " +
    "tools, and you must never claim to have changed anything. Answer briefly and only with facts " +
    "returned by tools. " +
    `This user can access: ${tiers.join(", ")}.`
  );
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function ownedConversation(auth: AuthContext, id: string) {
  const conversation = await prisma.aiConversation.findFirst({ where: { id, userId: auth.userId } });
  if (!conversation) throw AppError.notFound("Conversation not found.");
  return conversation;
}

async function logToolCall(auth: AuthContext, tool: string, ok: boolean, ms: number): Promise<void> {
  await prisma.aiToolCall.create({
    data: { communityId: auth.communityId ?? undefined, userId: auth.userId, tool, ok, ms },
  });
}

export async function createConversation(input: { title?: string }) {
  const auth = authContextOrThrow();
  return prisma.aiConversation.create({
    data: { userId: auth.userId, title: input.title?.trim() || DEFAULT_TITLE },
  });
}

export async function listConversations() {
  const auth = authContextOrThrow();
  return prisma.aiConversation.findMany({
    where: { userId: auth.userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true, role: true } },
    },
  });
}

export async function getConversation(id: string) {
  const auth = authContextOrThrow();
  await ownedConversation(auth, id);
  return prisma.aiConversation.findFirstOrThrow({
    where: { id, userId: auth.userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function deleteConversation(id: string) {
  const auth = authContextOrThrow();
  const { count } = await prisma.aiConversation.deleteMany({ where: { id, userId: auth.userId } });
  if (count === 0) throw AppError.notFound("Conversation not found.");
  return { id };
}

export function listTools() {
  const auth = authContextOrThrow();
  return toolsForRole(auth.role).map((tool) => ({
    name: tool.name,
    tier: tool.tier,
    description: tool.description,
  }));
}

export async function sendMessage(conversationId: string, content: string) {
  const auth = authContextOrThrow();
  const conversation = await ownedConversation(auth, conversationId);
  const provider = getLlmProvider();
  const available = toolsForRole(auth.role);

  const history = await prisma.aiMessage.findMany({
    where: { conversationId, role: { in: ["USER", "ASSISTANT"] } },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { role: true, content: true },
  });

  const userMessage = await prisma.aiMessage.create({
    data: { conversationId, role: "USER", content },
  });

  const plan = await provider.plan({
    system: systemPrompt(auth),
    history: history
      .reverse()
      .map((message) => ({ role: message.role === "USER" ? "user" : "assistant", content: message.content })),
    message: content,
    tools: available.map(toDefinition),
  });

  const executed: Array<{ name: string; args: Record<string, unknown>; result: AiToolResult }> = [];
  for (const call of plan.toolCalls.slice(0, MAX_TOOL_CALLS)) {
    const tool = findTool(auth.role, call.name);
    if (!tool) continue;
    const started = Date.now();
    try {
      const result = await tool.run(auth, call.arguments);
      await logToolCall(auth, tool.name, true, Date.now() - started);
      executed.push({ name: tool.name, args: call.arguments, result });
    } catch {
      await logToolCall(auth, tool.name, false, Date.now() - started);
      executed.push({ name: tool.name, args: call.arguments, result: { text: "I couldn't fetch that data." } });
    }
  }

  let reply = plan.reply;
  let tokens = plan.tokens;
  if (executed.length > 0) {
    const summarized = await provider.summarize({
      message: content,
      toolResults: executed.map((entry) => ({ name: entry.name, result: entry.result })),
    });
    reply = summarized.reply;
    tokens = summarized.tokens;
  }

  const toolMessages = [];
  for (const entry of executed) {
    toolMessages.push(
      await prisma.aiMessage.create({
        data: {
          conversationId,
          role: "TOOL",
          content: entry.result.text,
          toolName: entry.name,
          toolArgs: toJson(entry.args),
          toolResult: toJson(entry.result),
        },
      }),
    );
  }

  const assistantMessage = await prisma.aiMessage.create({
    data: { conversationId, role: "ASSISTANT", content: reply, tokens: tokens ?? null },
  });

  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: {
      updatedAt: new Date(),
      ...(conversation.title === DEFAULT_TITLE
        ? { title: content.length > 60 ? `${content.slice(0, 57)}...` : content }
        : {}),
    },
  });

  return { conversationId, messages: [userMessage, ...toolMessages, assistantMessage] };
}

export async function getDigest() {
  const auth = authContextOrThrow();
  const provider = getLlmProvider();
  const overview = await getOverview();

  let communityName = "Your community";
  if (auth.communityId) {
    const community = await prisma.community.findUnique({
      where: { id: auth.communityId },
      select: { name: true },
    });
    communityName = community?.name ?? communityName;
  }

  const digest = await provider.digest({ communityName, metrics: overview as unknown as Record<string, unknown> });
  return {
    generatedAt: new Date().toISOString(),
    communityName,
    summary: digest.summary,
    highlights: digest.highlights,
    metrics: {
      occupancyRate: overview.flats.occupancyRate,
      openComplaints: overview.complaints.open,
      collectionRate: overview.billing.collectionRate,
      entriesToday: overview.visitors.entriesToday,
      activeEmergencies: overview.emergency.active,
    },
  };
}
