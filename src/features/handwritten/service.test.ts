import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getContestEntry: vi.fn(),
  canAccessRoom: vi.fn(),
  findExerciseForUpload: vi.fn(),
  findOwnUpload: vi.fn(),
  findSubmissionImage: vi.fn(),
  isExerciseInContest: vi.fn(),
  saveHandwrittenImage: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  logError: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/features/contests/service", () => ({
  getContestEntry: mocks.getContestEntry,
}));
vi.mock("@/features/rooms/access", () => ({
  canAccessRoom: mocks.canAccessRoom,
}));
vi.mock("./repository", () => ({
  findExerciseForUpload: mocks.findExerciseForUpload,
  findOwnUpload: mocks.findOwnUpload,
  findSubmissionImage: mocks.findSubmissionImage,
  isExerciseInContest: mocks.isExerciseInContest,
  saveHandwrittenImage: mocks.saveHandwrittenImage,
}));
vi.mock("@/lib/storage", () => ({
  getStorage: () => ({ put: mocks.put, get: mocks.get, delete: mocks.del }),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.logError, info: vi.fn(), warn: vi.fn() },
}));
import {
  getOwnHandwrittenUpload,
  readHandwrittenImage,
  uploadHandwrittenImage,
} from "./service";

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const png = (size = 64) => {
  const bytes = new Uint8Array(size);
  bytes.set(PNG_HEAD);
  return { name: "bai-lam.png", bytes };
};
const exercise = {
  id: "ex-1",
  kind: "HANDWRITTEN",
  room: { id: "room-1", path: { published: true } },
};
const saved = {
  id: "sub-1",
  createdAt: new Date("2026-11-19T10:00:00Z"),
  replacedKey: null as string | null,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({ id: "user-1" });
  mocks.findExerciseForUpload.mockResolvedValue(exercise);
  mocks.canAccessRoom.mockResolvedValue(true);
  mocks.saveHandwrittenImage.mockResolvedValue(saved);
  mocks.put.mockResolvedValue(undefined);
  mocks.del.mockResolvedValue(undefined);
});

describe("uploadHandwrittenImage (practice)", () => {
  it("stores the image privately under a random key and records it", async () => {
    const result = await uploadHandwrittenImage({
      exerciseId: "ex-1",
      file: png(),
    });

    const [key, data] = mocks.put.mock.calls[0];
    expect(key).toMatch(/^handwritten\/[0-9a-f-]{36}\.png$/);
    expect(key).not.toContain("user-1");
    expect(Buffer.isBuffer(data)).toBe(true);
    expect(mocks.saveHandwrittenImage).toHaveBeenCalledWith({
      userId: "user-1",
      exerciseId: "ex-1",
      contestId: null,
      storageKey: key,
    });
    expect(result).toEqual({
      id: "sub-1",
      submittedAt: saved.createdAt,
      replaced: false,
    });
    expect(mocks.del).not.toHaveBeenCalled();
  });

  it("only lets students upload", async () => {
    mocks.requireRole.mockRejectedValue(new AppError(403, "FORBIDDEN", "no"));
    await expect(
      uploadHandwrittenImage({ exerciseId: "ex-1", file: png() }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a file of the wrong format",
      { name: "a.pdf", bytes: new Uint8Array(64) },
      "INVALID_IMAGE_TYPE",
    ],
    ["a file over 5 MB", png(5 * 1024 * 1024 + 1), "IMAGE_TOO_LARGE"],
    [
      "an empty file",
      { name: "a.png", bytes: new Uint8Array(0) },
      "EMPTY_IMAGE",
    ],
  ])(
    "rejects %s without touching storage or the database",
    async (_n, file, code) => {
      await expect(
        uploadHandwrittenImage({ exerciseId: "ex-1", file }),
      ).rejects.toMatchObject({ code });
      expect(mocks.put).not.toHaveBeenCalled();
      expect(mocks.saveHandwrittenImage).not.toHaveBeenCalled();
    },
  );

  it("refuses a locked room", async () => {
    mocks.canAccessRoom.mockResolvedValue(false);
    await expect(
      uploadHandwrittenImage({ exerciseId: "ex-1", file: png() }),
    ).rejects.toMatchObject({ status: 403, code: "ROOM_LOCKED" });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing exercise", null],
    [
      "an unpublished path",
      { ...exercise, room: { id: "r", path: { published: false } } },
    ],
    ["an exercise without a room", { ...exercise, room: null }],
  ])("answers 404 for %s", async (_n, value) => {
    mocks.findExerciseForUpload.mockResolvedValue(value);
    await expect(
      uploadHandwrittenImage({ exerciseId: "ex-1", file: png() }),
    ).rejects.toMatchObject({ status: 404 });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("refuses a code exercise", async () => {
    mocks.findExerciseForUpload.mockResolvedValue({
      ...exercise,
      kind: "CODE",
    });
    await expect(
      uploadHandwrittenImage({ exerciseId: "ex-1", file: png() }),
    ).rejects.toMatchObject({ code: "EXERCISE_NOT_HANDWRITTEN" });
    expect(mocks.put).not.toHaveBeenCalled();
  });
});

describe("uploadHandwrittenImage (replacing)", () => {
  it("deletes the old image only after the new one is saved", async () => {
    const order: string[] = [];
    mocks.saveHandwrittenImage.mockImplementation(async () => {
      order.push("save");
      return { ...saved, replacedKey: "handwritten/old.png" };
    });
    mocks.del.mockImplementation(async () => {
      order.push("delete");
    });

    const result = await uploadHandwrittenImage({
      exerciseId: "ex-1",
      file: png(),
    });

    expect(order).toEqual(["save", "delete"]);
    expect(mocks.del).toHaveBeenCalledWith("handwritten/old.png");
    expect(result.replaced).toBe(true);
  });

  it("keeps the old image and removes the new file when saving fails", async () => {
    mocks.saveHandwrittenImage.mockRejectedValue(
      new AppError(409, "SUBMISSION_FINALIZED", "graded"),
    );
    await expect(
      uploadHandwrittenImage({ exerciseId: "ex-1", file: png() }),
    ).rejects.toMatchObject({ code: "SUBMISSION_FINALIZED" });

    const newKey = mocks.put.mock.calls[0][0];
    expect(mocks.del).toHaveBeenCalledTimes(1);
    expect(mocks.del).toHaveBeenCalledWith(newKey);
  });

  it("still succeeds when the old file cannot be deleted", async () => {
    mocks.saveHandwrittenImage.mockResolvedValue({
      ...saved,
      replacedKey: "handwritten/old.png",
    });
    mocks.del.mockRejectedValue(new Error("storage down"));
    await expect(
      uploadHandwrittenImage({ exerciseId: "ex-1", file: png() }),
    ).resolves.toMatchObject({ id: "sub-1", replaced: true });
    expect(mocks.logError).toHaveBeenCalled();
  });
});

describe("uploadHandwrittenImage (contest)", () => {
  beforeEach(() => {
    mocks.getContestEntry.mockResolvedValue({
      userId: "user-1",
      contest: { id: "contest-1" },
    });
    mocks.isExerciseInContest.mockResolvedValue(true);
  });

  it("uses the contest attempt and skips room access", async () => {
    await uploadHandwrittenImage({
      exerciseId: "ex-1",
      contestSlug: "cuoc-thi",
      file: png(),
    });
    expect(mocks.getContestEntry).toHaveBeenCalledWith("cuoc-thi");
    expect(mocks.canAccessRoom).not.toHaveBeenCalled();
    expect(mocks.saveHandwrittenImage).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", contestId: "contest-1" }),
    );
  });

  it("rejects when the attempt is over (deadline passed)", async () => {
    mocks.getContestEntry.mockRejectedValue(
      new AppError(403, "CONTEST_NOT_OPEN", "Lượt làm bài của bạn đã hết giờ."),
    );
    await expect(
      uploadHandwrittenImage({
        exerciseId: "ex-1",
        contestSlug: "cuoc-thi",
        file: png(),
      }),
    ).rejects.toMatchObject({ code: "CONTEST_NOT_OPEN" });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("rejects an exercise that is not part of the contest", async () => {
    mocks.isExerciseInContest.mockResolvedValue(false);
    await expect(
      uploadHandwrittenImage({
        exerciseId: "ex-1",
        contestSlug: "cuoc-thi",
        file: png(),
      }),
    ).rejects.toMatchObject({ code: "EXERCISE_NOT_IN_CONTEST" });
    expect(mocks.put).not.toHaveBeenCalled();
  });
});

describe("readHandwrittenImage (access control)", () => {
  it("returns the image to its owner with the right content type", async () => {
    mocks.findSubmissionImage.mockResolvedValue({
      userId: "user-1",
      imageUrl: "handwritten/abc.webp",
    });
    mocks.get.mockResolvedValue(Buffer.from([1, 2, 3]));
    const result = await readHandwrittenImage("sub-1");
    expect(mocks.get).toHaveBeenCalledWith("handwritten/abc.webp");
    expect(result.mime).toBe("image/webp");
    expect([...result.bytes]).toEqual([1, 2, 3]);
  });

  it("answers 404 for another learner's image and never reads it from storage", async () => {
    mocks.findSubmissionImage.mockResolvedValue({
      userId: "user-2",
      imageUrl: "handwritten/secret.png",
    });
    await expect(readHandwrittenImage("sub-2")).rejects.toMatchObject({
      status: 404,
    });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("gives the same answer for a missing submission as for someone else's", async () => {
    mocks.findSubmissionImage.mockResolvedValueOnce(null);
    const missing = await readHandwrittenImage("nope").catch((e) => e);
    mocks.findSubmissionImage.mockResolvedValueOnce({
      userId: "user-2",
      imageUrl: "handwritten/secret.png",
    });
    const foreign = await readHandwrittenImage("sub-2").catch((e) => e);
    expect({
      status: foreign.status,
      code: foreign.code,
      message: foreign.message,
    }).toEqual({
      status: missing.status,
      code: missing.code,
      message: missing.message,
    });
  });

  it("answers 404 for a submission without an image (a code submission)", async () => {
    mocks.findSubmissionImage.mockResolvedValue({
      userId: "user-1",
      imageUrl: null,
    });
    await expect(readHandwrittenImage("sub-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("requires a signed-in student", async () => {
    mocks.requireRole.mockRejectedValue(new AppError(401, "UNAUTHORIZED", "x"));
    await expect(readHandwrittenImage("sub-1")).rejects.toMatchObject({
      status: 401,
    });
    expect(mocks.findSubmissionImage).not.toHaveBeenCalled();
  });
});

describe("getOwnHandwrittenUpload", () => {
  it("never exposes the storage key", async () => {
    mocks.findOwnUpload.mockResolvedValue({
      id: "sub-1",
      status: "PENDING",
      createdAt: saved.createdAt,
    });
    const upload = await getOwnHandwrittenUpload("user-1", "ex-1");
    expect(mocks.findOwnUpload).toHaveBeenCalledWith("user-1", "ex-1", null);
    expect(upload).toEqual({
      id: "sub-1",
      status: "PENDING",
      submittedAt: saved.createdAt,
    });
  });

  it("returns null before the first upload", async () => {
    mocks.findOwnUpload.mockResolvedValue(null);
    expect(await getOwnHandwrittenUpload("user-1", "ex-1")).toBeNull();
  });
});
