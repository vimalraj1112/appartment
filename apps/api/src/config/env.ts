import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000/api/v1"),
  WEB_URL: z.string().url().default("http://localhost:5173"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  TEST_DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  REFRESH_COOKIE_NAME: z.string().default("sl_refresh"),
  REFRESH_COOKIE_DAYS: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
  PAYMENT_PROVIDER: z.enum(["MOCK", "RAZORPAY"]).default("MOCK"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  LLM_PROVIDER: z.enum(["MOCK", "OPENAI"]).default("MOCK"),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default("gpt-4o-mini"),
  LLM_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
