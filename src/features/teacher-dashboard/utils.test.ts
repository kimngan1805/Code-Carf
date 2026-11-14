import { describe, expect, it } from "vitest";
import { MOCK_TEACHER_DASHBOARD } from "./mock-data";
import { ALL_PATHS_FILTER, buildTeacherOverviewView } from "./utils";

describe("buildTeacherOverviewView", () => {
  it("computes overall KPIs and sorts room alerts by lowest pass rate", () => {
    const view = buildTeacherOverviewView(MOCK_TEACHER_DASHBOARD);

    expect(view.paths).toHaveLength(4);
    expect(view.kpis.totalLearners).toBe(380);
    expect(view.kpis.activeLearners).toBe(285);
    expect(view.kpis.completedLearners).toBe(201);
    expect(view.kpis.bottleneckCount).toBe(4);
    expect(view.kpis.criticalBottleneckCount).toBe(3);

    const passRates = view.roomAlerts.map((alert) => alert.passRate);
    expect(passRates).toEqual([...passRates].sort((a, b) => a - b));
  });

  it("filters KPIs, chart paths, and room alerts by selected path", () => {
    const view = buildTeacherOverviewView(MOCK_TEACHER_DASHBOARD, "path-dsa");

    expect(view.paths).toHaveLength(1);
    expect(view.chartPaths).toHaveLength(1);
    expect(view.kpis.totalLearners).toBe(96);
    expect(view.kpis.avgCompletionRate).toBe(51);
    expect(view.kpis.avgPassRate).toBe(48);
    expect(view.roomAlerts).toHaveLength(2);
    expect(view.roomAlerts.every((alert) => alert.pathId === "path-dsa")).toBe(
      true,
    );
  });

  it("handles empty search matches gracefully without division by zero", () => {
    const view = buildTeacherOverviewView(
      MOCK_TEACHER_DASHBOARD,
      ALL_PATHS_FILTER,
      "khong-ton-tai",
    );

    expect(view.paths).toEqual([]);
    expect(view.roomAlerts).toEqual([]);
    expect(view.kpis).toEqual({
      totalLearners: 0,
      activeLearners: 0,
      completedLearners: 0,
      avgCompletionRate: 0,
      avgPassRate: 0,
      bottleneckCount: 0,
      criticalBottleneckCount: 0,
    });
  });
});
