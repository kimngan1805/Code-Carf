import { describe, expect, it } from "vitest";
import { RoleName } from "@prisma/client";
import { allowedRole } from "./permissions";

describe("role routing", () => {
  it("allows admins into admin routes", () =>
    expect(allowedRole("/admin/users", RoleName.ADMIN)).toBe(true));
  it("blocks students from grader routes", () =>
    expect(allowedRole("/grading", RoleName.STUDENT)).toBe(false));
});
