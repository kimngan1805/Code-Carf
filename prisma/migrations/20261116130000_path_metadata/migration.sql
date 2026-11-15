ALTER TABLE "Path"
  ADD COLUMN "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "estimatedMinutes" INTEGER,
  ADD COLUMN "coverTheme" TEXT NOT NULL DEFAULT 'blue',
  ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Paths that are already public keep a sensible "posted on" date.
UPDATE "Path" SET "publishedAt" = "createdAt" WHERE "published" = true;
