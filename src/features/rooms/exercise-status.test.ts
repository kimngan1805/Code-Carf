import { expect, it } from "vitest";
import { exerciseState } from "./exercise-status";

it("marks an unattempted exercise not started", () =>
  expect(exerciseState([])).toBe("not_started"));
it.each(["PENDING", "RUNNING", "NEEDS_REVIEW", "REJECTED", "ERROR"] as const)(
  "marks %s as submitted",
  (status) => expect(exerciseState([status])).toBe("submitted"),
);
it("retains passed after a later failed submission", () =>
  expect(exerciseState(["ACCEPTED", "REJECTED"])).toBe("passed"));
