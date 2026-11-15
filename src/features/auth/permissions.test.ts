import { describe, expect, it } from "vitest";
import { RoleName } from "@prisma/client";
import { allowedRole } from "./permissions";

describe("role routing", () => {
  it("restricts learner search to students", () => {
    expect(allowedRole("/hv/search", RoleName.STUDENT)).toBe(true);
    for (const role of [
      RoleName.TEACHER,
      RoleName.GRADER,
      RoleName.ADMIN,
      RoleName.GUEST,
      undefined,
    ]) {
      expect(allowedRole("/hv/search", role)).toBe(false);
    }
  });
  it("allows admins into admin routes", () =>
    expect(allowedRole("/admin/users", RoleName.ADMIN)).toBe(true));
  it("blocks students from grader routes", () =>
    expect(allowedRole("/grading", RoleName.STUDENT)).toBe(false));
  it("allows only students into achievements", () => {
    expect(allowedRole("/hv/achievements", RoleName.STUDENT)).toBe(true);
    expect(allowedRole("/hv/achievements", RoleName.TEACHER)).toBe(false);
    expect(allowedRole("/hv/achievements", RoleName.GRADER)).toBe(false);
    expect(allowedRole("/hv/achievements", RoleName.ADMIN)).toBe(false);
  });
  it("keeps teacher applicants (guests) out of learning and teaching areas", () => {
    for (const path of ["/hv/paths", "/hv/rooms", "/contests", "/gv", "/admin"])
      expect(allowedRole(path, RoleName.GUEST)).toBe(false);
    for (const path of ["/onboarding", "/settings", "/hv/dashboard"])
      expect(allowedRole(path, RoleName.GUEST)).toBe(true);
  });
  it("allows only students into the exercise editor", () => {
    expect(allowedRole("/hv/exercises/ex-1", RoleName.STUDENT)).toBe(true);
    for (const role of [RoleName.TEACHER, RoleName.GRADER, RoleName.ADMIN])
      expect(allowedRole("/hv/exercises/ex-1", role)).toBe(false);
    expect(allowedRole("/hv/exercises/ex-1", undefined)).toBe(false);
  });
  it("allows only students into submission history", () => {
    expect(allowedRole("/hv/submissions", RoleName.STUDENT)).toBe(true);
    expect(allowedRole("/hv/submissions/sub-1", RoleName.STUDENT)).toBe(true);
    for (const role of [RoleName.TEACHER, RoleName.GRADER, RoleName.ADMIN])
      expect(allowedRole("/hv/submissions/sub-1", role)).toBe(false);
    expect(allowedRole("/hv/submissions", undefined)).toBe(false);
  });
  it("allows all authenticated roles into settings", () => {
    for (const role of Object.values(RoleName)) {
      expect(allowedRole("/settings", role)).toBe(true);
    }
    expect(allowedRole("/settings", undefined)).toBe(false);
  });
  it("allows only students into profile", () => {
    expect(allowedRole("/hv/profile", RoleName.STUDENT)).toBe(true);
    expect(allowedRole("/hv/profile", RoleName.TEACHER)).toBe(false);
    expect(allowedRole("/hv/profile", RoleName.GRADER)).toBe(false);
    expect(allowedRole("/hv/profile", RoleName.ADMIN)).toBe(false);
    expect(allowedRole("/hv/profile", undefined)).toBe(false);
  });
  it("allows only students into leaderboard", () => {
    expect(allowedRole("/leaderboard", RoleName.STUDENT)).toBe(true);
    expect(allowedRole("/leaderboard", RoleName.TEACHER)).toBe(false);
    expect(allowedRole("/leaderboard", RoleName.GRADER)).toBe(false);
    expect(allowedRole("/leaderboard", RoleName.ADMIN)).toBe(false);
    expect(allowedRole("/leaderboard", RoleName.GUEST)).toBe(false);
    expect(allowedRole("/leaderboard", undefined)).toBe(false);
  });
  it("allows all authenticated roles to view public student profiles", () => {
    for (const role of Object.values(RoleName)) {
      expect(allowedRole("/u/student-1", role)).toBe(true);
    }
    expect(allowedRole("/u/student-1", undefined)).toBe(false);
  });
});
