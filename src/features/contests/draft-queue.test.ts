import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDraftQueue } from "./draft-queue";

const snapshot = (source: string) => ({
  exerciseId: "exercise",
  source,
  language: "python" as const,
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("active draft sync", () => {
  it("coalesces typing into the newest snapshot", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const queue = createDraftQueue(save, vi.fn());
    queue.activate();
    queue.update(snapshot("old"));
    queue.update(snapshot("new"));
    await vi.advanceTimersByTimeAsync(300);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(snapshot("new"));
  });
  it("serializes slow requests and saves the most recent edit next", async () => {
    let release!: () => void;
    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const queue = createDraftQueue(save, vi.fn());
    queue.activate();
    queue.update(snapshot("first"));
    await vi.advanceTimersByTimeAsync(300);
    queue.update(snapshot("second"));
    queue.update(snapshot("third"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
    release();
    await vi.advanceTimersByTimeAsync(1);
    expect(save.mock.calls.map(([value]) => value.source)).toEqual([
      "first",
      "third",
    ]);
  });
  it("stops unsent draft writes at the deadline", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const queue = createDraftQueue(save, vi.fn());
    queue.activate();
    queue.update(snapshot("pending"));
    queue.setClosed(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).not.toHaveBeenCalled();
  });
  it("retries a network failure without overwriting a newer edit", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    const notify = vi.fn();
    const queue = createDraftQueue(save, notify);
    queue.activate();
    queue.update(snapshot("first"));
    await vi.advanceTimersByTimeAsync(300);
    expect(notify).toHaveBeenCalledWith("error");
    queue.update(snapshot("newest"));
    await vi.advanceTimersByTimeAsync(300);
    expect(save.mock.calls.map(([value]) => value.source)).toEqual([
      "first",
      "newest",
    ]);
  });
  it("survives effect cleanup and reactivation without duplicate writes", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const queue = createDraftQueue(save, vi.fn());
    queue.activate();
    queue.update(snapshot("draft"));
    queue.pause();
    queue.activate();
    await vi.advanceTimersByTimeAsync(300);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
