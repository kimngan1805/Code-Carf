import { LearningGoal, SkillLevel } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { studentOnboardingSchema } from "./questions";
import { RECOMMENDED_SLUGS, recommendPathSlug } from "./recommend";

describe("recommendPathSlug", () => {
  it("sends web learners to the web path at any level", () =>
    expect(
      recommendPathSlug({
        level: SkillLevel.INTERMEDIATE,
        goal: LearningGoal.WEB,
      }),
    ).toBe(RECOMMENDED_SLUGS.web));
  it("starts beginners with fundamentals even if they want contests", () =>
    expect(
      recommendPathSlug({
        level: SkillLevel.BEGINNER,
        goal: LearningGoal.CONTESTS,
      }),
    ).toBe(RECOMMENDED_SLUGS.fundamentals));
  it("sends algorithm and contest goals to data structures", () => {
    expect(
      recommendPathSlug({
        level: SkillLevel.BASIC,
        goal: LearningGoal.ALGORITHMS,
      }),
    ).toBe(RECOMMENDED_SLUGS.algorithms);
    expect(
      recommendPathSlug({
        level: SkillLevel.BASIC,
        goal: LearningGoal.CONTESTS,
      }),
    ).toBe(RECOMMENDED_SLUGS.algorithms);
  });
  it("keeps basic learners on fundamentals", () =>
    expect(
      recommendPathSlug({
        level: SkillLevel.BASIC,
        goal: LearningGoal.FUNDAMENTALS,
      }),
    ).toBe(RECOMMENDED_SLUGS.fundamentals));
  it("moves strong learners past fundamentals", () =>
    expect(
      recommendPathSlug({
        level: SkillLevel.INTERMEDIATE,
        goal: LearningGoal.FUNDAMENTALS,
      }),
    ).toBe(RECOMMENDED_SLUGS.algorithms));
});

describe("studentOnboardingSchema", () => {
  it("accepts a complete answer set", () =>
    expect(
      studentOnboardingSchema.safeParse({
        level: "BASIC",
        goal: "WEB",
        languages: ["javascript"],
        dailyMinutes: "30",
      }).success,
    ).toBe(true));
  it("rejects missing languages and unknown durations", () => {
    const result = studentOnboardingSchema.safeParse({
      level: "BASIC",
      goal: "WEB",
      languages: [],
      dailyMinutes: "45",
    });
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(
      expect.arrayContaining(["languages", "dailyMinutes"]),
    );
  });
});
