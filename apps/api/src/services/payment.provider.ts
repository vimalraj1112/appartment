import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

export interface PaymentIntentInput {
  amountInr: number;
  currency: string;
  /** Human-readable reference, e.g. the bill period or bill id. */
  reference: string;
  idempotencyKey: string;
}

export interface PaymentIntent {
  providerRef: string;
  status: "SUCCESS" | "PROCESSING" | "FAILED";
  failureReason?: string;
}

export interface PaymentProviderAdapter {
  readonly name: "MOCK" | "RAZORPAY";
  createIntent(input: PaymentIntentInput): Promise<PaymentIntent>;
}

/**
 * Development/test adapter: settles instantly so the full billing flow can be
 * exercised without external credentials.
 */
class MockProvider implements PaymentProviderAdapter {
  readonly name = "MOCK" as const;

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
    return { providerRef: `mock_${input.idempotencyKey}_${randomUUID().slice(0, 8)}`, status: "SUCCESS" };
  }
}

/**
 * Razorpay adapter. Creates an order and leaves the payment PROCESSING until a
 * webhook/verification callback confirms capture (not wired in this phase).
 */
class RazorpayProvider implements PaymentProviderAdapter {
  readonly name = "RAZORPAY" as const;

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      return { providerRef: "", status: "FAILED", failureReason: "Razorpay is not configured." };
    }

    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "X-Razorpay-Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        amount: input.amountInr * 100,
        currency: input.currency,
        receipt: input.reference.slice(0, 40),
        notes: { idempotencyKey: input.idempotencyKey },
      }),
    });

    if (!response.ok) {
      return { providerRef: "", status: "FAILED", failureReason: "The payment gateway rejected the request." };
    }

    const order = (await response.json()) as { id: string; status: string };
    return { providerRef: order.id, status: "PROCESSING" };
  }
}

export function getPaymentProvider(): PaymentProviderAdapter {
  return env.PAYMENT_PROVIDER === "RAZORPAY" ? new RazorpayProvider() : new MockProvider();
}
