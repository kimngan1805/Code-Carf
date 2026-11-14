import { describe, expect, it } from "vitest";
import { formatDuration, getContestPhase } from "./time";

const startsAt = new Date("2026-11-15T02:00:00Z");
const endsAt = new Date("2026-11-15T04:00:00Z");
const schedule = { startsAt, endsAt };

describe("contest time", () => {
  it("uses a start-inclusive, end-exclusive competition window", () => {
    expect(getContestPhase(schedule, +startsAt - 1)).toBe("upcoming");
    expect(getContestPhase(schedule, +startsAt)).toBe("live");
    expect(getContestPhase(schedule, +endsAt - 1)).toBe("live");
    expect(getContestPhase(schedule, +endsAt)).toBe("ended");
  });
  it("does not open contests with missing or invalid schedules", () => {
    expect(getContestPhase({ startsAt: null, endsAt }, +startsAt)).toBe(
      "unscheduled",
    );
    expect(getContestPhase({ startsAt, endsAt: startsAt }, +startsAt)).toBe(
      "unscheduled",
    );
    expect(
      getContestPhase({ startsAt: endsAt, endsAt: startsAt }, +startsAt),
    ).toBe("unscheduled");
  });
  it("clamps expired countdowns and supports more than 24 hours", () => {
    expect(formatDuration(-1)).toBe("00:00:00");
    expect(formatDuration(1)).toBe("00:00:01");
    expect(formatDuration(25 * 3600000 + 61000)).toBe("25:01:01");
  });
});
