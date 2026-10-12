export interface SentEmail {
  to: string;
  subject: string;
  text: string;
  sentAt: Date;
}

/**
 * Outbound email seam.
 *
 * In development and tests, messages are captured in memory (and logged) so
 * flows like password reset can be exercised without a provider. A real
 * transport (SMTP / API provider) will be wired in here behind env config.
 */
export const sentEmails: SentEmail[] = [];

export function clearSentEmails(): void {
  sentEmails.length = 0;
}

export async function sendEmail(input: Omit<SentEmail, "sentAt">): Promise<void> {
  sentEmails.push({ ...input, sentAt: new Date() });
  if (process.env.NODE_ENV !== "test") {
    console.info(`[mail] to=${input.to} subject="${input.subject}"`);
  }
}