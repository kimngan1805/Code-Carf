-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Exercise_roomId_position_idx" ON "Exercise"("roomId", "position");


-- Thứ tự sẵn cho bài tập đã có: trắc nghiệm, rồi code, rồi tự luận (trong mỗi bài học).
UPDATE "Exercise" AS e
SET "position" = ordered.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "roomId"
    ORDER BY CASE "kind" WHEN 'QUIZ' THEN 0 WHEN 'CODE' THEN 1 ELSE 2 END, "id"
  ) AS rn
  FROM "Exercise"
  WHERE "roomId" IS NOT NULL
) AS ordered
WHERE e."id" = ordered."id";
