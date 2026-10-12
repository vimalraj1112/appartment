import { z } from "zod";

export const aiCreateConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});
export type AiCreateConversationInput = z.infer<typeof aiCreateConversationSchema>;

export const aiSendMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});
export type AiSendMessageInput = z.infer<typeof aiSendMessageSchema>;
