import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  effects: [] as Array<() => undefined | (() => void)>,
  states: [] as unknown[],
}));
vi.mock("react", () => ({
  useEffect: (run: () => undefined | (() => void)) => {
    hooks.effects.push(run);
  },
  useState: (initial: unknown) => {
    const index = hooks.states.push(initial) - 1;
    return [
      initial,
      (value: unknown) => {
        hooks.states[index] = value;
      },
    ];
  },
}));
import { useContestFinalization } from "./use-contest-finalization";

const fetchMock = vi.fn();
let events: EventTarget;
let cleanup: undefined | (() => void);
const reply = (status = "ACCEPTED") => ({
  ok: true,
  json: async () => ({
    data: { state: "submitted", submission: { id: "one-submission", status } },
  }),
});

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  hooks.effects.length = 0;
  hooks.states.length = 0;
  events = new EventTarget();
  vi.stubGlobal("window", events);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(reply());
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("expiry finalization requests", () => {
  it("does not finalize while there is still time", async () => {
    useContestFinalization("demo", false);
    cleanup = hooks.effects[0]();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sends one body-free request at expiry, including under Strict Mode effect replay", async () => {
    useContestFinalization("demo", true);
    const setup = hooks.effects[0];
    setup()?.();
    cleanup = setup();
    await vi.advanceTimersByTimeAsync(1);
    events.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/contests/demo/finalize");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });
  it("retries a lost response and retains the same server submission", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network offline"));
    useContestFinalization("demo", true);
    cleanup = hooks.effects[0]();
    await vi.advanceTimersByTimeAsync(2001);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(hooks.states[0]).toMatchObject({
      submission: { id: "one-submission" },
    });
  });
  it("polls a running result until grading completes, then stops", async () => {
    fetchMock.mockResolvedValueOnce(reply("RUNNING"));
    useContestFinalization("demo", true);
    cleanup = hooks.effects[0]();
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(hooks.states[0]).toMatchObject({
      submission: { status: "ACCEPTED" },
    });
  });
});
