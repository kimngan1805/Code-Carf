import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoleName } from "@prisma/client";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { db } from "@/lib/db";
import { canConnectToDatabase } from "@/test-utils/database";

// The signed-in user is chosen per test; the database, storage and rules are real.
let current: { id: string; role: { name: RoleName } } | null = null;
vi.mock("@/features/auth/service", async () => {
  const { AppError } = await import("@/lib/errors");
  return {
    requireRole: async (roles: RoleName[]) => {
      if (!current) throw new AppError(401, "UNAUTHORIZED", "Sign in");
      if (!roles.includes(current.role.name))
        throw new AppError(403, "FORBIDDEN", "Insufficient permission");
      return current;
    },
  };
});

import {
  deleteRoomAttachment,
  readRoomAttachment,
  reorderRoomAttachments,
  uploadRoomAttachment,
} from "./attachments";

const hasDatabase = await canConnectToDatabase();

const encode = (text: string) => new TextEncoder().encode(text);
const pdf = (name = "bai-giang.pdf") => ({
  name,
  type: "application/pdf",
  bytes: encode(`%PDF-1.7\n${name}\n%%EOF`),
});
const pptx = (name = "slide.pptx") => ({
  name,
  type: "",
  bytes: new Uint8Array([
    0x50,
    0x4b,
    0x03,
    0x04,
    ...encode("[Content_Types].xml ppt/presentation.xml"),
  ]),
});

async function errorOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as { status: number; code: string };
  }
  throw new Error("expected the call to fail");
}

describe.skipIf(!hasDatabase)(
  "lesson attachments (PostgreSQL integration)",
  () => {
    let storageDir = "";
    const previousEnv = {
      driver: process.env.STORAGE_DRIVER,
      dir: process.env.STORAGE_DIR,
    };
    const userIds: string[] = [];
    const pathIds: string[] = [];

    beforeAll(async () => {
      storageDir = await mkdtemp(join(tmpdir(), "room-attachments-"));
      process.env.STORAGE_DRIVER = "local";
      process.env.STORAGE_DIR = storageDir;
    });

    afterEach(async () => {
      current = null;
      await rm(join(storageDir, "room-attachments"), {
        recursive: true,
        force: true,
      });
      await db.path.deleteMany({ where: { id: { in: pathIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
      userIds.length = pathIds.length = 0;
    });

    afterAll(async () => {
      await db.$disconnect();
      await rm(storageDir, { recursive: true, force: true });
      for (const [name, value] of [
        ["STORAGE_DRIVER", previousEnv.driver],
        ["STORAGE_DIR", previousEnv.dir],
      ] as const) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    });

    const storedFiles = async () =>
      (await readdir(join(storageDir, "room-attachments")).catch(() => []))
        .length;

    async function user(role: RoleName) {
      const saved = await db.role.upsert({
        where: { name: role },
        update: {},
        create: { name: role },
      });
      const created = await db.user.create({
        data: {
          email: `attach-${role.toLowerCase()}-${randomUUID()}@local.test`,
          name: `Attachment ${role}`,
          passwordHash: "not-used-in-test",
          roleId: saved.id,
        },
      });
      userIds.push(created.id);
      return { id: created.id, role: { name: role } };
    }

    /** A published path with two rooms, owned by a teacher, and a learner enrolled in it. */
    async function setup() {
      const [owner, otherTeacher, admin, learner, outsider] = await Promise.all(
        [
          user(RoleName.TEACHER),
          user(RoleName.TEACHER),
          user(RoleName.ADMIN),
          user(RoleName.STUDENT),
          user(RoleName.STUDENT),
        ],
      );
      const path = await db.path.create({
        data: {
          slug: `attach-${randomUUID()}`,
          title: "Attachment path",
          published: true,
          creatorId: owner.id,
          rooms: {
            create: [
              { title: "Bài 1", position: 1, published: true },
              { title: "Bài 2", position: 2, published: true },
            ],
          },
          enrollments: { create: { userId: learner.id } },
        },
        include: { rooms: { orderBy: { position: "asc" } } },
      });
      pathIds.push(path.id);
      return {
        owner,
        otherTeacher,
        admin,
        learner,
        outsider,
        path,
        room: path.rooms[0],
        lockedRoom: path.rooms[1],
      };
    }

    it("lets the owning teacher upload, reorder and delete files", async () => {
      const { owner, room } = await setup();
      current = owner;
      const first = await uploadRoomAttachment({
        roomId: room.id,
        file: pdf(),
      });
      const second = await uploadRoomAttachment({
        roomId: room.id,
        file: pptx(),
      });
      expect(first.attachment).toMatchObject({
        fileName: "bai-giang.pdf",
        contentType: "application/pdf",
      });
      expect(second.attachment.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      );
      expect(await storedFiles()).toBe(2);

      const reordered = await reorderRoomAttachments({
        roomId: room.id,
        attachmentIds: [second.attachment.id, first.attachment.id],
      });
      expect(reordered.attachments.map((file) => file.id)).toEqual([
        second.attachment.id,
        first.attachment.id,
      ]);

      const afterDelete = await deleteRoomAttachment({
        roomId: room.id,
        attachmentId: second.attachment.id,
      });
      expect(afterDelete.attachments.map((file) => file.id)).toEqual([
        first.attachment.id,
      ]);
      expect(await storedFiles()).toBe(1);
    });

    it("refuses changes from other teachers and learners, and lets an admin manage any path", async () => {
      const { owner, otherTeacher, admin, learner, room } = await setup();
      current = owner;
      const { attachment } = await uploadRoomAttachment({
        roomId: room.id,
        file: pdf(),
      });

      current = otherTeacher;
      expect(
        await errorOf(uploadRoomAttachment({ roomId: room.id, file: pdf() })),
      ).toMatchObject({ status: 404, code: "ROOM_NOT_FOUND" });
      expect(
        await errorOf(
          reorderRoomAttachments({
            roomId: room.id,
            attachmentIds: [attachment.id],
          }),
        ),
      ).toMatchObject({ status: 404 });
      expect(
        await errorOf(
          deleteRoomAttachment({
            roomId: room.id,
            attachmentId: attachment.id,
          }),
        ),
      ).toMatchObject({ status: 404 });
      expect(
        await errorOf(readRoomAttachment(room.id, attachment.id)),
      ).toMatchObject({ status: 404, code: "ATTACHMENT_NOT_FOUND" });

      current = learner;
      expect(
        await errorOf(uploadRoomAttachment({ roomId: room.id, file: pdf() })),
      ).toMatchObject({ status: 403 });
      expect(
        await errorOf(
          deleteRoomAttachment({
            roomId: room.id,
            attachmentId: attachment.id,
          }),
        ),
      ).toMatchObject({ status: 403 });

      current = admin;
      await uploadRoomAttachment({ roomId: room.id, file: pptx() });
      expect(
        await db.roomAttachment.count({ where: { roomId: room.id } }),
      ).toBe(2);
      expect(await storedFiles()).toBe(2);
    });

    it("stores nothing when the file type is wrong", async () => {
      const { owner, room } = await setup();
      current = owner;
      expect(
        await errorOf(
          uploadRoomAttachment({
            roomId: room.id,
            file: { name: "slide.pptx", type: "", bytes: pdf().bytes },
          }),
        ),
      ).toMatchObject({ status: 400, code: "ATTACHMENT_CONTENT_MISMATCH" });
      expect(await storedFiles()).toBe(0);
      expect(
        await db.roomAttachment.count({ where: { roomId: room.id } }),
      ).toBe(0);
    });

    it("refuses an order that does not list exactly the current files", async () => {
      const { owner, room } = await setup();
      current = owner;
      const { attachment } = await uploadRoomAttachment({
        roomId: room.id,
        file: pdf(),
      });
      await uploadRoomAttachment({ roomId: room.id, file: pptx() });
      expect(
        await errorOf(
          reorderRoomAttachments({
            roomId: room.id,
            attachmentIds: [attachment.id, attachment.id],
          }),
        ),
      ).toMatchObject({ status: 409, code: "ATTACHMENTS_CHANGED" });
    });

    it("serves files to enrolled learners of unlocked rooms only", async () => {
      const { owner, learner, outsider, room, lockedRoom } = await setup();
      current = owner;
      const open = await uploadRoomAttachment({ roomId: room.id, file: pdf() });
      const locked = await uploadRoomAttachment({
        roomId: lockedRoom.id,
        file: pptx(),
      });
      expect(
        (await readRoomAttachment(room.id, open.attachment.id)).fileName,
      ).toBe("bai-giang.pdf");

      current = learner;
      const read = await readRoomAttachment(room.id, open.attachment.id);
      expect(read.contentType).toBe("application/pdf");
      expect(Buffer.from(read.bytes).toString("latin1")).toContain("%PDF-");
      // Room 2 stays locked until room 1 is completed.
      expect(
        await errorOf(readRoomAttachment(lockedRoom.id, locked.attachment.id)),
      ).toMatchObject({ status: 404 });
      // The attachment id must belong to the room in the URL.
      expect(
        await errorOf(readRoomAttachment(room.id, locked.attachment.id)),
      ).toMatchObject({ status: 404 });

      current = outsider;
      expect(
        await errorOf(readRoomAttachment(room.id, open.attachment.id)),
      ).toMatchObject({ status: 404 });

      // A draft room is hidden from learners but still readable by its teacher.
      await db.room.update({
        where: { id: room.id },
        data: { published: false },
      });
      current = learner;
      expect(
        await errorOf(readRoomAttachment(room.id, open.attachment.id)),
      ).toMatchObject({ status: 404 });
      current = owner;
      expect(
        (await readRoomAttachment(room.id, open.attachment.id)).fileName,
      ).toBe("bai-giang.pdf");
    });

    it("opens a locked room's files once the previous room is completed, or when the path is not sequential", async () => {
      const { owner, learner, path, room, lockedRoom } = await setup();
      current = owner;
      const { attachment } = await uploadRoomAttachment({
        roomId: lockedRoom.id,
        file: pdf(),
      });
      current = learner;
      expect(
        await errorOf(readRoomAttachment(lockedRoom.id, attachment.id)),
      ).toMatchObject({ status: 404 });

      await db.path.update({
        where: { id: path.id },
        data: { sequentialUnlock: false },
      });
      expect(
        (await readRoomAttachment(lockedRoom.id, attachment.id)).fileName,
      ).toBe("bai-giang.pdf");

      await db.path.update({
        where: { id: path.id },
        data: { sequentialUnlock: true },
      });
      await db.roomProgress.create({
        data: { userId: learner.id, roomId: room.id },
      });
      expect(
        (await readRoomAttachment(lockedRoom.id, attachment.id)).fileName,
      ).toBe("bai-giang.pdf");
    });

    it("hides and freezes the files of a soft-deleted path, keeping them in storage", async () => {
      const { owner, admin, learner, path, room } = await setup();
      current = owner;
      const { attachment } = await uploadRoomAttachment({
        roomId: room.id,
        file: pdf(),
      });
      // Same effect as deleteManagedPath: the path is soft-deleted and unpublished.
      await db.path.update({
        where: { id: path.id },
        data: { deletedAt: new Date(), published: false },
      });

      for (const user of [learner, owner, admin]) {
        current = user;
        expect(
          await errorOf(readRoomAttachment(room.id, attachment.id)),
        ).toMatchObject({ status: 404 });
      }
      for (const user of [owner, admin]) {
        current = user;
        expect(
          await errorOf(uploadRoomAttachment({ roomId: room.id, file: pdf() })),
        ).toMatchObject({ status: 404, code: "ROOM_NOT_FOUND" });
        expect(
          await errorOf(
            deleteRoomAttachment({
              roomId: room.id,
              attachmentId: attachment.id,
            }),
          ),
        ).toMatchObject({ status: 404 });
      }
      // Soft delete keeps learning data, so the file and its row stay.
      expect(await storedFiles()).toBe(1);
      expect(
        await db.roomAttachment.count({ where: { roomId: room.id } }),
      ).toBe(1);
    });
  },
);
