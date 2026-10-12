import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createConversation,
  deleteConversation,
  getConversation,
  getDigest,
  listConversations,
  listTools,
  sendMessage,
  type AiMessage,
} from "../features/ai/ai-api";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { Input } from "../components/ui/input";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";
import { cn } from "../lib/cn";

interface SpeechRecognitionEventLike {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionLike {
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
}

interface SpeechWindow {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message }: { message: AiMessage }) {
  if (message.role === "TOOL") {
    return (
      <div className="flex justify-center">
        <div className="flex max-w-2xl items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1 text-xs text-[var(--color-muted-foreground)]">
          <Icon name="search" className="h-3.5 w-3.5" />
          <span className="font-medium">{message.toolName}</span>
          <span className="truncate">{message.content}</span>
        </div>
      </div>
    );
  }

  const mine = message.role === "USER";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] space-y-1 rounded-2xl px-4 py-2 text-sm",
          mine
            ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
            : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className={cn("text-[10px]", mine ? "opacity-70" : "text-[var(--color-muted-foreground)]")}>
          {timeOf(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function DigestPanel() {
  const digest = useQuery({ queryKey: ["ai", "digest"], queryFn: getDigest });
  if (digest.isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Spinner className="h-5 w-5" />
        </CardContent>
      </Card>
    );
  }
  if (digest.isError || !digest.data) return null;
  const data = digest.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="bot" className="h-4 w-4" /> Weekly digest
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[var(--color-foreground)]">{data.summary}</p>
        <div className="flex flex-wrap gap-2">
          {data.highlights.map((highlight) => (
            <Badge key={highlight} variant="muted">
              {highlight}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AssistantPage({ showDigest = false }: { showDigest?: boolean }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const conversations = useQuery({ queryKey: ["ai", "conversations"], queryFn: listConversations });
  const thread = useQuery({
    queryKey: ["ai", "conversation", selectedId],
    queryFn: () => getConversation(selectedId as string),
    enabled: Boolean(selectedId),
  });
  const tools = useQuery({ queryKey: ["ai", "tools"], queryFn: listTools });

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });

  const remove = useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: (_result, id) => {
      invalidateList();
      if (selectedId === id) setSelectedId(null);
    },
  });

  const send = useMutation({
    mutationFn: async (content: string) => {
      let id = selectedId;
      if (!id) {
        const conversation = await createConversation();
        id = conversation.id;
      }
      await sendMessage(id, content);
      return id;
    },
    onSuccess: (id) => {
      setSelectedId(id);
      setInput("");
      invalidateList();
      queryClient.invalidateQueries({ queryKey: ["ai", "conversation", id] });
    },
  });

  const messages = thread.data?.messages ?? [];
  const speechWindow = typeof window === "undefined" ? undefined : (window as unknown as SpeechWindow);
  const Recognition = speechWindow?.SpeechRecognition ?? speechWindow?.webkitSpeechRecognition;

  function submit() {
    const content = input.trim();
    if (content.length === 0 || send.isPending) return;
    send.mutate(content);
  }

  function startVoice() {
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setInput((current) => (current ? `${current} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistant"
        subtitle="Ask about community statistics, your bills, visitors, bookings, complaints, or help topics. The assistant only reads data."
      />

      {showDigest && <DigestPanel />}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <div className="flex items-center justify-between gap-2 p-6 pb-2">
            <CardTitle>Chats</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setSelectedId(null)}>
              <Icon name="plus" className="h-4 w-4" /> New
            </Button>
          </div>
          <div className="space-y-1 px-4 pb-4">
            {conversations.isLoading ? (
              <div className="flex justify-center py-6">
                <Spinner className="h-5 w-5" />
              </div>
            ) : (conversations.data ?? []).length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">No conversations yet.</p>
            ) : (
              conversations.data?.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                    selectedId === conversation.id
                      ? "bg-[var(--color-muted)]"
                      : "hover:bg-[var(--color-muted)]",
                  )}
                >
                  <button
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => setSelectedId(conversation.id)}
                  >
                    {conversation.title}
                  </button>
                  <button
                    className="text-[var(--color-muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Delete conversation"
                    onClick={() => remove.mutate(conversation.id)}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="flex min-h-[520px] flex-col">
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="flex-1 space-y-3 overflow-y-auto">
              {!selectedId || messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-[var(--color-muted-foreground)]">
                  <Icon name="bot" className="h-8 w-8" />
                  <p>Start a new conversation and ask a question.</p>
                  {(tools.data ?? []).length > 0 && (
                    <p className="max-w-md">
                      Available tools: {tools.data?.map((tool) => tool.name).join(", ")}
                    </p>
                  )}
                </div>
              ) : (
                messages.map((message) => <MessageBubble key={message.id} message={message} />)
              )}
              {send.isPending && (
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                  <Spinner className="h-3.5 w-3.5" /> Thinking...
                </div>
              )}
            </div>

            {send.isError && <Alert variant="destructive">{send.error.message}</Alert>}

            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <Input
                placeholder="Ask the assistant..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Voice input"
                title={Recognition ? "Dictate your question" : "Voice input isn't supported in this browser."}
                disabled={!Recognition || listening}
                onClick={startVoice}
              >
                <Icon name="mic" className={cn("h-4 w-4", listening && "text-[var(--color-primary)]")} />
              </Button>
              <Button type="submit" size="icon" aria-label="Send" loading={send.isPending} disabled={!input.trim()}>
                <Icon name="send" className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
