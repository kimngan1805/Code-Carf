-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "creatorId" TEXT,
ADD COLUMN "sourceId" TEXT;

-- AlterTable
ALTER TABLE "RoomAttachment" ADD COLUMN "libraryFileId" TEXT;

-- CreateTable
CREATE TABLE "LibraryFile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibraryFile_storageKey_key" ON "LibraryFile"("storageKey");

-- CreateIndex
CREATE INDEX "LibraryFile_ownerId_createdAt_idx" ON "LibraryFile"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Exercise_creatorId_sourceId_idx" ON "Exercise"("creatorId", "sourceId");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAttachment" ADD CONSTRAINT "RoomAttachment_libraryFileId_fkey" FOREIGN KEY ("libraryFileId") REFERENCES "LibraryFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryFile" ADD CONSTRAINT "LibraryFile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: bài tập đã nằm trong bài học thuộc về giảng viên tạo lộ trình, để hiện trong kho tài liệu.
UPDATE "Exercise" AS e
SET "creatorId" = p."creatorId"
FROM "Room" AS r
JOIN "Path" AS p ON p."id" = r."pathId"
WHERE e."roomId" = r."id" AND e."creatorId" IS NULL;
