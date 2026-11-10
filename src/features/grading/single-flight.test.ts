import { describe, expect, it, vi } from "vitest";
import { createSingleFlight } from "./single-flight";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createSingleFlight", () => {
  it("runs a task only once when clicked repeatedly before it finishes", async () => {
    const flight = createSingleFlight();
    const gate = deferred<string>();
    const task = vi.fn(() => gate.promise);

    const first = flight.run(task);
    const second = flight.run(task);
    const third = flight.run(task);
    expect(flight.busy).toBe(true);
    expect(await second).toEqual({ started: false });
    expect(await third).toEqual({ started: false });

    gate.resolve("done");
    expect(await first).toEqual({ started: true, value: "done" });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("accepts a new task after the previous one finished", async () => {
    const flight = createSingleFlight();
    await flight.run(async () => 1);
    expect(flight.busy).toBe(false);
    expect(await flight.run(async () => 2)).toEqual({
      started: true,
      value: 2,
    });
  });

  it("releases the lock when the task throws", async () => {
    const flight = createSingleFlight();
    await expect(
      flight.run(async () => {
        throw new Error("network");
      }),
    ).rejects.toThrow("network");
    expect(flight.busy).toBe(false);
    expect(await flight.run(async () => "ok")).toEqual({
      started: true,
      value: "ok",
    });
  });
});
