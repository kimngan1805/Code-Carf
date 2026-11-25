import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  getMyNotifications: vi.fn(),
  markMyNotificationRead: vi.fn(),
  markAllMyNotificationsRead: vi.fn(),
}));

vi.mock("@/features/notifications/service", () => ({
  getMyNotifications: mocks.getMyNotifications,
  markMyNotificationRead: mocks.markMyNotificationRead,
  markAllMyNotificationsRead: mocks.markAllMyNotificationsRead,
}));

import { GET as getNotifications } from "./route";
import { PATCH as patchRead } from "./[id]/read/route";
import { POST as postReadAll } from "./read-all/route";

describe("notifications API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated GET /api/notifications with 401 and Cache-Control: no-store", async () => {
    mocks.getMyNotifications.mockRejectedValue(
      new AppError(401, "UNAUTHORIZED", "Sign in required"),
    );

    const response = await getNotifications(
      new Request("http://localhost:3000/api/notifications"),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      data: null,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("returns notifications for signed-in users with Cache-Control: no-store", async () => {
    mocks.getMyNotifications.mockResolvedValue({
      notifications: [{ id: "n-1", title: "Test" }],
      unreadCount: 1,
    });

    const response = await getNotifications(
      new Request("http://localhost:3000/api/notifications?limit=15"),
    );

    expect(mocks.getMyNotifications).toHaveBeenCalledWith("15");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      data: {
        notifications: [{ id: "n-1", title: "Test" }],
        unreadCount: 1,
      },
      error: null,
    });
  });

  it("enforces same-origin and authentication on PATCH /api/notifications/[id]/read", async () => {
    const crossOriginReq = new Request(
      "http://localhost:3000/api/notifications/n-1/read",
      {
        method: "PATCH",
        headers: {
          host: "localhost:3000",
          origin: "https://evil.example",
        },
      },
    );
    const crossOriginRes = await patchRead(crossOriginReq, {
      params: Promise.resolve({ id: "n-1" }),
    });
    expect(crossOriginRes.status).toBe(403);
    expect(mocks.markMyNotificationRead).not.toHaveBeenCalled();

    mocks.markMyNotificationRead.mockRejectedValueOnce(
      new AppError(401, "UNAUTHORIZED", "Sign in required"),
    );
    const unauthRes = await patchRead(
      new Request("http://localhost:3000/api/notifications/n-1/read", {
        method: "PATCH",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      }),
      { params: Promise.resolve({ id: "n-1" }) },
    );
    expect(unauthRes.status).toBe(401);

    mocks.markMyNotificationRead.mockResolvedValueOnce({
      id: "n-1",
      readAt: "2026-11-16T00:00:00.000Z",
    });
    const okRes = await patchRead(
      new Request("http://localhost:3000/api/notifications/n-1/read", {
        method: "PATCH",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      }),
      { params: Promise.resolve({ id: "n-1" }) },
    );
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get("Cache-Control")).toBe("no-store");
  });

  it("enforces authentication and same-origin on POST /api/notifications/read-all", async () => {
    mocks.markAllMyNotificationsRead.mockRejectedValueOnce(
      new AppError(401, "UNAUTHORIZED", "Sign in required"),
    );
    const unauthRes = await postReadAll(
      new Request("http://localhost:3000/api/notifications/read-all", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      }),
    );
    expect(unauthRes.status).toBe(401);

    mocks.markAllMyNotificationsRead.mockResolvedValueOnce({ updatedCount: 3 });
    const okRes = await postReadAll(
      new Request("http://localhost:3000/api/notifications/read-all", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      }),
    );
    expect(okRes.status).toBe(200);
    await expect(okRes.json()).resolves.toEqual({
      data: { updatedCount: 3 },
      error: null,
    });
  });
});
