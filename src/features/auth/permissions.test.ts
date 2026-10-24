import { describe, expect, it } from "vitest";
import { RoleName } from "@prisma/client";
import { allowedRole } from "./permissions";

describe("role routing", () => {
  it("allows admins into admin routes", () =>
    expect(allowedRole("/admin/users", RoleName.ADMIN)).toBe(true));
  it("blocks students from grader routes", () =>
    expect(allowedRole("/grading", RoleName.STUDENT)).toBe(false));
  it("allows only students into achievements", () => {
    expect(allowedRole("/achievements", RoleName.STUDENT)).toBe(true);
    expect(allowedRole("/achievements", RoleName.TEACHER)).toBe(false);
    expect(allowedRole("/achievements", RoleName.GRADER)).toBe(false);
    expect(allowedRole("/achievements", RoleName.ADMIN)).toBe(false);
  });
  it("allows all authenticated roles into settings", () => {
    for (const role of Object.values(RoleName)) {
      expect(allowedRole("/settings", role)).toBe(true);
    }
    expect(allowedRole("/settings", undefined)).toBe(false);
  });
  it("allows only students into profile", () => {
    expect(allowedRole("/profile", RoleName.STUDENT)).toBe(true);
    expect(allowedRole("/profile", RoleName.TEACHER)).toBe(false);
    expect(allowedRole("/profile", RoleName.GRADER)).toBe(false);
    expect(allowedRole("/profile", RoleName.ADMIN)).toBe(false);
    expect(allowedRole("/profile", undefined)).toBe(false);
  });
  it("allows all authenticated roles to view public student profiles", () => {
    for (const role of Object.values(RoleName)) {
      expect(allowedRole("/u/student-1", role)).toBe(true);
    }
    expect(allowedRole("/u/student-1", undefined)).toBe(false);
  });
});
