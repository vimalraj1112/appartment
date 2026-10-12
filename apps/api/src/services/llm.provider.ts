import { env } from "../config/env.js";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlmToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface LlmPlan {
  toolCalls: LlmToolCall[];
  reply: string;
  tokens?: number;
}

export interface LlmToolResult {
  name: string;
  result: unknown;
}

export interface LlmPlanRequest {
  system: string;
  history: LlmMessage[];
  message: string;
  tools: LlmToolDefinition[];
}

export interface LlmSummarizeRequest {
  message: string;
  toolResults: LlmToolResult[];
}

export interface LlmDigestRequest {
  communityName: string;
  metrics: Record<string, unknown>;
}

export interface LlmDigest {
  summary: string;
  highlights: string[];
  tokens?: number;
}

/**
 * Vendor-agnostic seam for the assistant's language model. A deterministic mock
 * backs tests and local development; `LLM_PROVIDER=OPENAI` selects the
 * OpenAI-compatible HTTP adapter.
 */
export interface LlmProvider {
  readonly name: string;
  plan(request: LlmPlanRequest): Promise<LlmPlan>;
  summarize(request: LlmSummarizeRequest): Promise<{ reply: string; tokens?: number }>;
  digest(request: LlmDigestRequest): Promise<LlmDigest>;
}

function estimateTokens(...parts: string[]): number {
  return Math.max(1, Math.round(parts.join(" ").length / 4));
}

/** Keyword → tool routing used by the deterministic mock (and as a fallback). */
const TOOL_KEYWORDS: Record<string, string[]> = {
  community_overview: ["overview", "summary", "statistic", "how many", "occupanc", "dashboard", "health"],
  community_finance: ["collection", "revenue", "finance", "collected", "money", "outstanding", "inr"],
  community_complaints: ["complaint", "ticket"],
  community_visitors: ["visitor", "gate", "entry", "guest"],
  my_bills: ["bill", "payment", "due", "paid", "outstanding", "invoice"],
  my_visitors: ["visitor", "pass", "guest", "entry"],
  my_bookings: ["booking", "amenit", "clubhouse", "gym", "pool"],
  my_complaints: ["complaint", "ticket", "issue", "repair"],
  help_topics: ["help", "how do", "how to", "guide", "support", "what can you"],
};

const HELP_FALLBACK =
  "I can look things up for you, but I'm not sure which of my tools fits. Try asking about " +
  "community statistics, your bills, visitors, bookings, complaints, or type \"help\" for a guide. " +
  "I can only read data — I can't make changes.";

function matchTool(tools: LlmToolDefinition[], message: string): string | null {
  const lower = message.toLowerCase();
  for (const tool of tools) {
    const keywords = TOOL_KEYWORDS[tool.name] ?? [];
    if (keywords.some((keyword) => lower.includes(keyword))) return tool.name;
  }
  return null;
}

function resultText(result: unknown): string {
  if (result && typeof result === "object" && "text" in result) {
    const text = (result as { text?: unknown }).text;
    if (typeof text === "string") return text;
  }
  return JSON.stringify(result);
}

class MockLlmProvider implements LlmProvider {
  readonly name = "MOCK";

  async plan(request: LlmPlanRequest): Promise<LlmPlan> {
    const tool = matchTool(request.tools, request.message);
    const tokens = estimateTokens(request.message);
    if (!tool) {
      return { toolCalls: [], reply: HELP_FALLBACK, tokens };
    }
    return { toolCalls: [{ name: tool, arguments: {} }], reply: "", tokens };
  }

  async summarize(request: LlmSummarizeRequest): Promise<{ reply: string; tokens?: number }> {
    const parts = request.toolResults.map((entry) => resultText(entry.result));
    if (parts.length === 0) {
      return { reply: HELP_FALLBACK, tokens: estimateTokens(request.message) };
    }
    const reply = parts.join("\n\n");
    return { reply, tokens: estimateTokens(request.message, reply) };
  }

  async digest(request: LlmDigestRequest): Promise<LlmDigest> {
    const m = request.metrics as {
      flats?: { occupied?: number; total?: number; occupancyRate?: number };
      complaints?: { open?: number; total?: number; resolutionRate?: number };
      billing?: { period?: string; collectedInr?: number; billedInr?: number; collectionRate?: number };
      visitors?: { entriesToday?: number; activePasses?: number };
      emergency?: { active?: number; last90Days?: number };
    };
    const flats = m.flats ?? {};
    const complaints = m.complaints ?? {};
    const billing = m.billing ?? {};
    const visitors = m.visitors ?? {};
    const emergency = m.emergency ?? {};

    const summary =
      `${request.communityName} sits at ${flats.occupancyRate ?? 0}% occupancy ` +
      `(${flats.occupied ?? 0}/${flats.total ?? 0} flats) with ${complaints.open ?? 0} open ` +
      `complaints. Collections for ${billing.period ?? "the period"} reached ` +
      `${billing.collectionRate ?? 0}% (₹${(billing.collectedInr ?? 0).toLocaleString("en-IN")} of ` +
      `₹${(billing.billedInr ?? 0).toLocaleString("en-IN")}). ` +
      `${visitors.entriesToday ?? 0} gate entries were logged today and ` +
      `${emergency.active ?? 0} emergencies are active.`;

    const highlights = [
      `Occupancy: ${flats.occupancyRate ?? 0}%`,
      `Complaints: ${complaints.open ?? 0} open / ${complaints.total ?? 0} total`,
      `Collection rate: ${billing.collectionRate ?? 0}%`,
      `Gate entries today: ${visitors.entriesToday ?? 0}`,
      `Active emergencies: ${emergency.active ?? 0}`,
    ];

    return { summary, highlights, tokens: estimateTokens(summary, highlights.join(" ")) };
  }
}

interface OpenAiToolCall {
  function?: { name?: string; arguments?: string };
}

class OpenAiLlmProvider implements LlmProvider {
  readonly name = "OPENAI";

  private async chat(messages: Array<Record<string, unknown>>, tools?: LlmToolDefinition[]) {
    const response = await fetch(`${env.LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.LLM_API_KEY ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        messages,
        tools: tools?.map((tool) => ({ type: "function", function: tool })),
        tool_choice: tools && tools.length ? "auto" : undefined,
      }),
    });
    if (!response.ok) throw new Error("The language model request failed.");
    return (await response.json()) as {
      choices?: Array<{ message?: { content?: string; tool_calls?: OpenAiToolCall[] } }>;
      usage?: { total_tokens?: number };
    };
  }

  async plan(request: LlmPlanRequest): Promise<LlmPlan> {
    const messages = [
      { role: "system", content: request.system },
      ...request.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: request.message },
    ];
    const completion = await this.chat(messages, request.tools);
    const message = completion.choices?.[0]?.message;
    const toolCalls: LlmToolCall[] = (message?.tool_calls ?? [])
      .filter((call) => call.function?.name)
      .map((call) => ({
        name: call.function!.name as string,
        arguments: call.function?.arguments ? (JSON.parse(call.function.arguments) as Record<string, unknown>) : {},
      }));
    return {
      toolCalls,
      reply: message?.content ?? "",
      tokens: completion.usage?.total_tokens,
    };
  }

  async summarize(request: LlmSummarizeRequest): Promise<{ reply: string; tokens?: number }> {
    const completion = await this.chat([
      {
        role: "system",
        content: "Summarize the tool results for the resident in plain, friendly language. Do not invent data.",
      },
      { role: "user", content: request.message },
      {
        role: "assistant",
        content: "",
      },
      {
        role: "user",
        content: `Tool results:\n${request.toolResults
          .map((entry) => `- ${entry.name}: ${resultText(entry.result)}`)
          .join("\n")}`,
      },
    ]);
    return {
      reply: completion.choices?.[0]?.message?.content ?? "I could not summarize that right now.",
      tokens: completion.usage?.total_tokens,
    };
  }

  async digest(request: LlmDigestRequest): Promise<LlmDigest> {
    const completion = await this.chat([
      {
        role: "system",
        content:
          "Write a short weekly operations digest for a community manager. Return JSON " +
          '{"summary": string, "highlights": string[]} using only the provided metrics.',
      },
      { role: "user", content: `${request.communityName} metrics: ${JSON.stringify(request.metrics)}` },
    ]);
    const content = completion.choices?.[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(content) as { summary?: string; highlights?: string[] };
      return {
        summary: parsed.summary ?? "",
        highlights: parsed.highlights ?? [],
        tokens: completion.usage?.total_tokens,
      };
    } catch {
      return { summary: content, highlights: [], tokens: completion.usage?.total_tokens };
    }
  }
}

export function getLlmProvider(): LlmProvider {
  if (env.LLM_PROVIDER === "OPENAI" && env.LLM_API_KEY) {
    return new OpenAiLlmProvider();
  }
  return new MockLlmProvider();
}

export const mockLlmProvider = new MockLlmProvider();
