import { afterEach, describe, expect, it, vi } from "vitest";
import { canConnectToDatabase } from "./database";

afterEach(() => vi.unstubAllEnvs());

describe("canConnectToDatabase", () => {
  it("is false when no database URL is configured", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(canConnectToDatabase()).resolves.toBe(false);
  });
});
