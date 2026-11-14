import { describe, expect, it } from "vitest";
import { canAccessRoom } from "./access";

describe("canAccessRoom (contract stub)", () => {
  it("resolves to a boolean", async () => {
    await expect(canAccessRoom("user-1", "room-1")).resolves.toBeTypeOf(
      "boolean",
    );
  });

  it("grants access until sequential unlock (#12) is implemented", async () => {
    await expect(canAccessRoom("user-1", "room-1")).resolves.toBe(true);
  });
});
