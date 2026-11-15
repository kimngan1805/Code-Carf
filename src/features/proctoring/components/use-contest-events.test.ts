import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const hooks = vi.hoisted(() => ({
  effects: [] as Array<() => undefined | (() => void)>,
  states: [] as unknown[],
}));
vi.mock("react", () => ({
  useEffect: (run: () => undefined | (() => void)) => hooks.effects.push(run),
  useState: (initial: unknown) => {
    const index = hooks.states.push(initial) - 1;
    return [
      initial,
      (value: unknown) => {
        hooks.states[index] =
          typeof value === "function" ? value(hooks.states[index]) : value;
      },
    ];
  },
}));
import { useContestEvents } from "./use-contest-events";

const fetchMock = vi.fn();
const initial = { violationCount: 0, threshold: 3, flagged: false };
let documentEvents: EventTarget;
let cleanup: undefined | (() => void);
function visible(value: "visible" | "hidden") {
  Object.defineProperty(documentEvents, "visibilityState", {
    value,
    configurable: true,
  });
  documentEvents.dispatchEvent(new Event("visibilitychange"));
}
beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  hooks.states.length = 0;
  hooks.effects.length = 0;
  documentEvents = new EventTarget();
  Object.defineProperty(documentEvents, "visibilityState", {
    value: "visible",
    configurable: true,
  });
  vi.stubGlobal("document", documentEvents);
  vi.stubGlobal("window", {
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (_url, options) => ({
    ok: true,
    json: async () => ({
      data:
        options?.method === "POST"
          ? { status: { ...initial, violationCount: 1 } }
          : initial,
    }),
  }));
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("workspace event listeners and warnings", () => {
  it("records an actual fullscreen departure but not initial normal mode or entry", async () => {
    useContestEvents("sample", true, initial);
    cleanup = hooks.effects[0]();
    documentEvents.dispatchEvent(new Event("fullscreenchange"));
    Object.defineProperty(documentEvents, "fullscreenElement", {
      value: {},
      configurable: true,
    });
    documentEvents.dispatchEvent(new Event("fullscreenchange"));
    Object.defineProperty(documentEvents, "fullscreenElement", {
      value: null,
      configurable: true,
    });
    documentEvents.dispatchEvent(new Event("fullscreenchange"));
    visible("hidden");
    await vi.advanceTimersByTimeAsync(1);
    const posts = fetchMock.mock.calls.filter(
      ([, options]) => options?.method === "POST",
    );
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0][1].body).type).toBe("FULLSCREEN_EXIT");
    expect(hooks.states[1]).toBe("FULLSCREEN_EXIT");
  });
  it("does not register or send while the attempt is closed", () => {
    useContestEvents("sample", false, initial);
    cleanup = hooks.effects[0]();
    visible("hidden");
    documentEvents.dispatchEvent(new Event("paste"));
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("records leaving a tab, warns immediately and resynchronizes on return", async () => {
    useContestEvents("sample", true, initial);
    cleanup = hooks.effects[0]();
    visible("hidden");
    expect(hooks.states[1]).toBe("TAB_SWITCH");
    visible("visible");
    await vi.advanceTimersByTimeAsync(1);
    const posts = fetchMock.mock.calls.filter(
      ([, options]) => options?.method === "POST",
    );
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0][1].body).type).toBe("TAB_SWITCH");
    expect(hooks.states[0]).toMatchObject({ violationCount: 1 });
  });
  it("captures paste length without blocking paste or leaking contents", async () => {
    useContestEvents("sample", true, initial);
    cleanup = hooks.effects[0]();
    const event = new Event("paste", { cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => "private pasted code" },
    });
    documentEvents.dispatchEvent(event);
    await vi.advanceTimersByTimeAsync(1);
    const post = fetchMock.mock.calls.find(
      ([, options]) => options?.method === "POST",
    );
    expect(event.defaultPrevented).toBe(false);
    expect(hooks.states[1]).toBe("PASTE");
    expect(JSON.parse(post![1].body).pasteLength).toBe(
      "private pasted code".length,
    );
    expect(post![1].body).not.toContain("private pasted code");
  });
  it("retains a local warning on network failure and removes listeners on cleanup", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    useContestEvents("sample", true, initial);
    cleanup = hooks.effects[0]();
    expect(() => visible("hidden")).not.toThrow();
    await vi.advanceTimersByTimeAsync(1);
    expect(hooks.states[1]).toBe("TAB_SWITCH");
    expect(hooks.states[2]).toBe(true);
    cleanup?.();
    cleanup = undefined;
    fetchMock.mockClear();
    visible("visible");
    documentEvents.dispatchEvent(new Event("paste"));
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
