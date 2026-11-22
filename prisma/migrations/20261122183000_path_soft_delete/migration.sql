-- AlterTable
ALTER TABLE "Path" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Path_deletedAt_published_idx" ON "Path"("deletedAt", "published");

-- CreateIndex
CREATE INDEX "Path_creatorId_deletedAt_idx" ON "Path"("creatorId", "deletedAt");
