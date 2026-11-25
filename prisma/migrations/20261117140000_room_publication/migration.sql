-- Add published status to Room; new rooms start as Draft by default.
ALTER TABLE "Room" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;

-- Preserve student access to existing rooms belonging to already-published paths.
UPDATE "Room"
SET "published" = true
WHERE "pathId" IN (SELECT "id" FROM "Path" WHERE "published" = true);

CREATE INDEX "Room_pathId_published_position_idx" ON "Room"("pathId", "published", "position");
