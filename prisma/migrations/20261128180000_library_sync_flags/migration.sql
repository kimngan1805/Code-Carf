-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "librarySynced" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "libraryVideosSynced" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RoomAttachment" ADD COLUMN     "librarySynced" BOOLEAN NOT NULL DEFAULT false;


-- Những gì đã có bản trong kho thì đánh dấu đã đồng bộ, để không chép lại.
UPDATE "Exercise" SET "librarySynced" = true WHERE "roomId" IS NOT NULL AND "sourceId" IS NOT NULL;
UPDATE "RoomAttachment" SET "librarySynced" = true WHERE "libraryFileId" IS NOT NULL;
UPDATE "Room" AS r SET "libraryVideosSynced" = true
WHERE EXISTS (
  SELECT 1 FROM "Path" AS p
  JOIN "LibraryFile" AS l ON l."ownerId" = p."creatorId" AND l."kind" = 'VIDEO'
  WHERE p."id" = r."pathId" AND strpos(r."content", l."youtubeId") > 0
);
