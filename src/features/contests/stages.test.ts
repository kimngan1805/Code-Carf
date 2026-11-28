import { describe, expect, it } from "vitest";
import { resolveContestStages, stageDeadline } from "./stages";

const stages = [
  {
    id: "s4",
    number: 4,
    name: "Đền hàm",
    exerciseCount: 5,
    durationMinutes: 30,
  },
  {
    id: "s5",
    number: 5,
    name: "Hang con trỏ",
    exerciseCount: 4,
    durationMinutes: 25,
  },
  {
    id: "s6",
    number: 6,
    name: "Tượng đá OOP",
    exerciseCount: 2,
    durationMinutes: 40,
  },
];
const now = Date.UTC(2026, 10, 29, 3);
const done = (count: number) =>
  Array.from({ length: 11 }, (_, index) => index < count);
const attempt = (stageId: string, minutesLeft: number) => ({
  stageId,
  startedAt: new Date(now - 60000),
  deadlineAt: new Date(now + minutesLeft * 60000),
});

describe("contest stages", () => {
  it("opens stage 4 first and keeps it until all five exercises are submitted", () => {
    expect(
      resolveContestStages(stages, done(0), [], now).current,
    ).toMatchObject({
      number: 4,
      start: 0,
      end: 5,
    });
    expect(resolveContestStages(stages, done(4), [], now).current?.number).toBe(
      4,
    );
    expect(
      resolveContestStages(stages, done(5), [], now).current,
    ).toMatchObject({
      number: 5,
      start: 5,
      end: 9,
    });
  });

  it("closes a stage when its own time runs out, even with exercises left", () => {
    const state = resolveContestStages(
      stages,
      done(2),
      [attempt("s4", -1)],
      now,
    );
    expect(state.stages[0].done).toBe(true);
    expect(state.current?.number).toBe(5);
  });

  it("keeps a stage open while its timer is still running", () => {
    const state = resolveContestStages(
      stages,
      done(2),
      [attempt("s4", 10)],
      now,
    );
    expect(state.current?.number).toBe(4);
    expect(state.current?.attempt?.deadlineAt).toEqual(new Date(now + 600000));
  });

  it("has no current stage once every stage is submitted or timed out", () => {
    const attempts = [attempt("s5", -5), attempt("s6", -1)];
    expect(
      resolveContestStages(stages, done(5), attempts, now).current,
    ).toBeNull();
  });

  it("does not split ordinary contests into stages", () => {
    expect(resolveContestStages([], done(1), [], now).current).toBeNull();
  });

  it("gives each stage its full time without passing the attempt deadline", () => {
    const start = new Date(now);
    expect(stageDeadline(start, 30, new Date(now + 86400000))).toEqual(
      new Date(now + 30 * 60000),
    );
    expect(stageDeadline(start, 30, new Date(now + 600000))).toEqual(
      new Date(now + 600000),
    );
  });
});
