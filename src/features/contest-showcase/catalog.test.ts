import { describe, expect, it } from "vitest";
import {
  CONTEST_FORMATS,
  defaultProfile,
  formatDuration,
  sampleContests,
  withProfile,
} from "./catalog";
import type { PublicContest } from "./service";

const real: PublicContest = {
  slug: "real",
  title: "Real",
  description: "",
  phase: "upcoming",
  registrationPhase: "live",
  registrationOpensAt: null,
  registrationClosesAt: null,
  examStartsAt: null,
  examEndsAt: null,
  durationMinutes: 60,
  exercises: 3,
  participants: 0,
};

describe("contest showcase catalog", () => {
  it("gives sample contests unique slugs and covers every format", () => {
    const samples = sampleContests(Date.UTC(2026, 10, 24));
    expect(new Set(samples.map((c) => c.slug)).size).toBe(samples.length);
    const formats = new Set(samples.map((c) => c.profile.format));
    expect([...formats].sort()).toEqual(Object.keys(CONTEST_FORMATS).sort());
    expect(samples.every((c) => c.sample)).toBe(true);
  });

  it("keeps real contests honest: not a sample, coding sections from exercises", () => {
    const contest = withProfile(real);
    expect(contest.sample).toBe(false);
    expect(contest.people).toEqual([]);
    expect(defaultProfile(real).sections).toEqual([
      { title: "Bài lập trình", questionType: "coding", count: 3 },
    ]);
  });

  it("formats durations in minutes, hours and whole days", () => {
    expect(formatDuration(45)).toBe("45 phút");
    expect(formatDuration(90)).toBe("1 giờ 30 phút");
    expect(formatDuration(120)).toBe("2 giờ");
    expect(formatDuration(30 * 24 * 60)).toBe("30 ngày");
  });
});
