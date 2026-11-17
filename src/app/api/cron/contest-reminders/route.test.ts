import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendUpcomingContestReminders: vi.fn(),
}));

vi.mock("@/features/notifications/writer", () => ({
  sendUpcomingContestReminders: mocks.sendUpcomingContestReminders,
}));

import { POST } from "./route";

describe("POST /api/cron/contest-reminders", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret-value";
    mocks.sendUpcomingContestReminders.mockResolvedValue({
      contestsScanned: 1,
      notificationsCreated: 2,
    });
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("rejects requests when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await POST(
      new Request("http://localhost:3000/api/cron/contest-reminders", {
        method: "POST",
        headers: { authorization: "Bearer test-cron-secret-value" },
      }),
    );

    expect(response.status).toBe(500);
    expect(mocks.sendUpcomingContestReminders).not.toHaveBeenCalled();
  });

  it("rejects missing or invalid Bearer tokens with 401", async () => {
    const missingRes = await POST(
      new Request("http://localhost:3000/api/cron/contest-reminders", {
        method: "POST",
      }),
    );
    expect(missingRes.status).toBe(401);

    const wrongRes = await POST(
      new Request("http://localhost:3000/api/cron/contest-reminders", {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );
    expect(wrongRes.status).toBe(401);
    expect(mocks.sendUpcomingContestReminders).not.toHaveBeenCalled();
  });

  it("runs upcoming contest reminders when Bearer secret matches", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/cron/contest-reminders", {
        method: "POST",
        headers: { authorization: "Bearer test-cron-secret-value" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.sendUpcomingContestReminders).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({
      data: { contestsScanned: 1, notificationsCreated: 2 },
      error: null,
    });
  });
});
