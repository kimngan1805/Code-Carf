import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url().startsWith("postgresql://"),
  AUTH_SECRET: z.string().min(32),
  GRADER_ADAPTER: z.enum(["mock", "judge0"]).default("mock"),
  JUDGE0_URL: z.url().default("http://localhost:2358"),
});

export function getEnv() {
  return schema.parse(process.env);
}
