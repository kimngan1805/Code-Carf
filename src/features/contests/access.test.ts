import { describe, expect, it } from "vitest";
import { assertParticipantCanEnter, assertRegistrationOpen } from "./access";

const start = Date.parse("2026-11-15T02:00:00Z");
const end = start + 3600000;
const contest = {
  startsAt: new Date(start - 3600000),
  endsAt: new Date(start),
  examStartsAt: new Date(start),
  examEndsAt: new Date(end + 3600000),
  requireFaceCheck: false,
};
const participant = {
  startedAt: new Date(start),
  deadlineAt: new Date(end),
  finishedAt: null,
  faceVerifiedAt: null,
};

describe("contest access", () => {
  it("allows registration only within its own window", () => {
    expect(() => assertRegistrationOpen(contest, start - 3600001)).toThrow();
    expect(() =>
      assertRegistrationOpen(contest, start - 3600000),
    ).not.toThrow();
    expect(() => assertRegistrationOpen(contest, start)).toThrow();
  });
  it("guards both time boundaries using the server time", () => {
    expect(() =>
      assertParticipantCanEnter(contest, participant, start - 1),
    ).toThrow();
    expect(() =>
      assertParticipantCanEnter(contest, participant, start),
    ).not.toThrow();
    expect(() =>
      assertParticipantCanEnter(contest, participant, end - 1),
    ).not.toThrow();
    expect(() =>
      assertParticipantCanEnter(contest, participant, end),
    ).toThrow();
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
      assertRegistrationOpen({ ...contest, endsAt: null }, start),
    ).toThrow();
  });
  it("closing registration does not expire a student's active attempt", () => {
    const closedRegistration = { ...contest, endsAt: new Date(start - 1) };
    expect(() =>
      assertParticipantCanEnter(closedRegistration, participant, start),
    ).not.toThrow();
  });
  it("registration alone does not start the clock or unlock statements", () => {
    expect(() =>
      assertParticipantCanEnter(
        contest,
        { ...participant, startedAt: null, deadlineAt: null },
        start,
      ),
    ).toThrow("Bắt đầu làm bài");
  });
});
