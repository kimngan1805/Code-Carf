-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'BASIC', 'INTERMEDIATE');

-- CreateEnum
CREATE TYPE "LearningGoal" AS ENUM ('FUNDAMENTALS', 'ALGORITHMS', 'CONTESTS', 'WEB');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LearnerProfile" (
    "userId" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL,
    "goal" "LearningGoal" NOT NULL,
    "languages" TEXT[],
    "dailyMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerProfile_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "LearnerProfile" ADD CONSTRAINT "LearnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing accounts skip onboarding; only new sign-ups answer the questions.
UPDATE "User" SET "onboardedAt" = "createdAt" WHERE "onboardedAt" IS NULL;
