import "dotenv/config";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
// Keep rate limiting out of the way for integration tests unless a test opts in.
process.env.RATE_LIMIT_GLOBAL_MAX = "100000";
process.env.RATE_LIMIT_AUTH_MAX = "100000";