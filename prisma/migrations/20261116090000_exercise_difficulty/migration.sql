CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

ALTER TABLE "Exercise" ADD COLUMN "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY';
