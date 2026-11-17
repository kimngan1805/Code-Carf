import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  room: vi.fn(),
  rooms: vi.fn(),
  statuses: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    room: { findFirst: mocks.room, findMany: mocks.rooms },
    submission: { groupBy: mocks.statuses },
  },
}));
import {
  findRoomContent,
  findRoomExerciseStatuses,
  listRooms,
} from "./repository";

it("aggregates only the current learner's practice submissions in this room", async () => {
  await findRoomExerciseStatuses("room-1", "user-1");
  expect(mocks.statuses).toHaveBeenCalledWith({
    by: ["exerciseId", "status"],
    where: {
      userId: "user-1",
      contestId: null,
      exercise: { roomId: "room-1" },
    },
  });
});
it("does not select hidden tests, rubrics, sources or another learner's submissions", async () => {
  await findRoomContent("room-1");
  const query = mocks.room.mock.calls[0][0];
  expect(query.where.published).toBe(true);
  expect(query.where.path).toEqual({ published: true, deletedAt: null });
  const selection = query.select.exercises.select;
  expect(selection.prompt).toBe(true);
  for (const key of ["testCases", "rubric", "submissions", "source"])
    expect(selection[key]).toBeUndefined();
});
it("lists only published rooms belonging to active published paths", async () => {
  await listRooms();
  expect(mocks.rooms.mock.calls[0][0].where).toEqual({
    published: true,
    path: { published: true, deletedAt: null },
  });
});
