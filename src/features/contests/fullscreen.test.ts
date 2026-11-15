import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enterExamFullscreen,
  exitExamFullscreen,
  prepareExamEntry,
} from "./fullscreen";
afterEach(() => vi.unstubAllGlobals());
describe("exam entry", () => {
  it("requests fullscreen before starting the server clock and navigating", async () => {
    const calls: string[] = [];
    await prepareExamEntry(true, false, {
      fullscreen: async () => {
        calls.push("fullscreen");
      },
      start: async () => {
        calls.push("start");
      },
      navigate: () => {
        calls.push("navigate");
      },
    });
    expect(calls).toEqual(["fullscreen", "start", "navigate"]);
  });
  it("does not start or navigate when fullscreen permission is denied", async () => {
    const actions = {
      fullscreen: vi.fn().mockRejectedValue(new Error("denied")),
      start: vi.fn(),
      navigate: vi.fn(),
    };
    await expect(prepareExamEntry(true, false, actions)).rejects.toThrow(
      "denied",
    );
    expect(actions.start).not.toHaveBeenCalled();
    expect(actions.navigate).not.toHaveBeenCalled();
  });
  it("normal mode does not request fullscreen, and resuming never starts a new clock", async () => {
    const actions = { fullscreen: vi.fn(), start: vi.fn(), navigate: vi.fn() };
    await prepareExamEntry(false, true, actions);
    expect(actions.fullscreen).not.toHaveBeenCalled();
    expect(actions.start).not.toHaveBeenCalled();
    expect(actions.navigate).toHaveBeenCalledOnce();
  });
  it("a refused server start never navigates to the editor", async () => {
    const actions = {
      fullscreen: vi.fn(),
      start: vi.fn().mockRejectedValue(new Error("closed")),
      navigate: vi.fn(),
    };
    await expect(prepareExamEntry(false, false, actions)).rejects.toThrow(
      "closed",
    );
    expect(actions.navigate).not.toHaveBeenCalled();
  });
  it("handles unsupported or denied fullscreen without swallowing the entry error", async () => {
    vi.stubGlobal("document", { documentElement: {} });
    await expect(enterExamFullscreen()).rejects.toThrow("chưa hỗ trợ");
    vi.stubGlobal("document", {
      documentElement: {
        requestFullscreen: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });
    await expect(enterExamFullscreen()).rejects.toThrow(
      "Chưa thể vào toàn màn hình",
    );
  });
  it("keeps existing fullscreen and ignores an already completed exit", async () => {
    const request = vi.fn();
    const exit = vi.fn().mockRejectedValue(new Error("already exited"));
    vi.stubGlobal("document", {
      fullscreenElement: {},
      documentElement: { requestFullscreen: request },
      exitFullscreen: exit,
    });
    await enterExamFullscreen();
    expect(request).not.toHaveBeenCalled();
    await expect(exitExamFullscreen()).resolves.toBeUndefined();
  });
});
