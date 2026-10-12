import "dotenv/config";
import { execSync } from "node:child_process";

export default function globalSetup(): void {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL must be set to run API tests.");
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
}