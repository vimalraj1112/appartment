import { apiRequest } from "../../lib/api";

export type AiRole = "USER" | "ASSISTANT" | "TOOL";
export type AiTier = "COMMUNITY" | "OWN" | "HELP";

export interface AiMessage {
  id: string;
  conversationId: string;
  role: AiRole;
  content: string;
  toolName?: string | null;
  toolArgs?: unknown;
  toolResult?: unknown;
  tokens?: number | null;
  createdAt: string;
}

export interface AiConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
  messages: Array<{ content: string; role: AiRole }>;
}

export interface AiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiMessage[];
}

export interface AiTool {
  name: string;
  tier: AiTier;
  description: string;
}

export interface AiSendResult {
  conversationId: string;
  messages: AiMessage[];
}

export interface AiDigest {
  generatedAt: string;
  communityName: string;
  summary: string;
  highlights: string[];
  metrics: {
    occupancyRate: number;
    openComplaints: number;
    collectionRate: number;
    entriesToday: number;
    activeEmergencies: number;
  };
}

export function listConversations(): Promise<AiConversationSummary[]> {
  return apiRequest<AiConversationSummary[]>("/ai/conversations");
}

export function createConversation(title?: string): Promise<AiConversation> {
  return apiRequest<AiConversation>("/ai/conversations", {
    method: "POST",
    body: title ? { title } : {},
  });
}

export function getConversation(id: string): Promise<AiConversation> {
  return apiRequest<AiConversation>(`/ai/conversations/${id}`);
}

export function deleteConversation(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/ai/conversations/${id}`, { method: "DELETE" });
}

export function sendMessage(id: string, content: string): Promise<AiSendResult> {
  return apiRequest<AiSendResult>(`/ai/conversations/${id}/messages`, {
    method: "POST",
    body: { content },
  });
}

export function listTools(): Promise<AiTool[]> {
  return apiRequest<AiTool[]>("/ai/tools");
}

export function getDigest(): Promise<AiDigest> {
  return apiRequest<AiDigest>("/ai/digest");
}
