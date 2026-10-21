import { describe, expect, it } from "vitest";
import {
  assertContestOpen,
  assertParticipantCanEnter,
  assertRegistrationOpen,
} from "./access";

const start = Date.parse("2026-11-15T02:00:00Z");
const end = start + 3600000;
const contest = {
  startsAt: new Date(start),
  endsAt: new Date(end),
  requireFaceCheck: false,
};
const participant = { finishedAt: null, faceVerifiedAt: null };

describe("contest access", () => {
  it("allows registration before and during the contest, but not at the deadline", () => {
    expect(() => assertRegistrationOpen(contest, start - 1)).not.toThrow();
    expect(() => assertRegistrationOpen(contest, start)).not.toThrow();
    expect(() => assertRegistrationOpen(contest, end)).toThrow();
  });
  it("guards both time boundaries using the server time", () => {
    expect(() => assertContestOpen(contest, start - 1)).toThrow();
    expect(() => assertContestOpen(contest, start)).not.toThrow();
    expect(() => assertContestOpen(contest, end - 1)).not.toThrow();
    expect(() => assertContestOpen(contest, end)).toThrow();
  });
  it("requires registration and an unfinished attempt", () => {
    expect(() => assertParticipantCanEnter(contest, null, start)).toThrow(
      "đăng ký",
    );
    expect(() =>
      assertParticipantCanEnter(
        contest,
        { ...participant, finishedAt: new Date(start) },
        start,
      ),
    ).toThrow("kết thúc");
    expect(() =>
      assertParticipantCanEnter(contest, participant, start),
    ).not.toThrow();
  });
  it("does not bypass a required face check", () => {
    const faceContest = { ...contest, requireFaceCheck: true };
    expect(() =>
      assertParticipantCanEnter(faceContest, participant, start),
    ).toThrow("khuôn mặt");
    expect(() =>
      assertParticipantCanEnter(
        faceContest,
        { ...participant, faceVerifiedAt: new Date(start) },
        start,
      ),
    ).not.toThrow();
  });
  it("rejects schedules that have not been configured", () => {
    expect(() =>
      assertRegistrationOpen({ ...contest, startsAt: null }, start),
    ).toThrow();
    expect(() =>
      assertContestOpen({ ...contest, endsAt: null }, start),
    ).toThrow();
  });
});
