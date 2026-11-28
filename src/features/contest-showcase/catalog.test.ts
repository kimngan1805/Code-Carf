import { describe, expect, it } from "vitest";
import {
  CONTEST_FORMATS,
  defaultProfile,
  formatDuration,
  journeyForLearner,
  sampleProfile,
  sampleContestSeeds,
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

  it("seeds every sample with the same schedule the showcase displays", () => {
    const now = Date.UTC(2026, 10, 24);
    const seeds = sampleContestSeeds(now);
    const samples = sampleContests(now);
    expect(seeds.map((seed) => seed.slug)).toEqual(
      samples.map((sample) => sample.slug),
    );
    for (const [index, seed] of seeds.entries()) {
      expect(seed.examStartsAt.toISOString()).toBe(samples[index].examStartsAt);
      expect(+seed.endsAt).toBeLessThan(+seed.examStartsAt);
    }
  });

  it("keeps a seeded sample's introduction but counts its real exercises", () => {
    const contest = withProfile({ ...real, slug: "giao-huu-python" });
    expect(contest.sample).toBe(false);
    expect(contest.profile.format).toBe("friendly");
    expect(contest.profile.sections).toEqual([
      { title: "Bài lập trình", questionType: "coding", count: 3 },
    ]);
  });

  it("moves the journey map to the learner's current stage and shows stage times", () => {
    const journey = sampleProfile("dao-kho-bau-cpp")!.journey!;
    const stages = [
      { number: 4, durationMinutes: 30 },
      { number: 5, durationMinutes: 25 },
      { number: 6, durationMinutes: 40 },
    ];
    const at5 = journeyForLearner(journey, stages, 5);
    expect(at5.currentStage).toBe(4);
    expect(at5.stages[3].minutes).toBe(30);
    expect(at5.stages[5].minutes).toBe(40);
    expect(at5.stages[6].minutes).toBeUndefined();
    // Every seeded stage done: the map moves past the last one.
    expect(journeyForLearner(journey, stages, null).currentStage).toBe(6);
    // Without stages in the database the sample map is unchanged.
    expect(journeyForLearner(journey, [], null)).toBe(journey);
  });

  it("formats durations in minutes, hours and whole days", () => {
    expect(formatDuration(45)).toBe("45 phút");
    expect(formatDuration(90)).toBe("1 giờ 30 phút");
    expect(formatDuration(120)).toBe("2 giờ");
    expect(formatDuration(30 * 24 * 60)).toBe("30 ngày");
  });
});
