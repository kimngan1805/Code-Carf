-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('ROOM_COMPLETED', 'CONTEST_RESULT', 'BADGE', 'STREAK_BONUS', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ProctoringEventType" AS ENUM ('TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'PASTE', 'FACE_MISSING', 'FACE_MISMATCH', 'MULTIPLE_FACES');

-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE 'NEEDS_REVIEW';

-- DropForeignKey
ALTER TABLE "Exercise" DROP CONSTRAINT "Exercise_contestId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastActiveOn" DATE,
ADD COLUMN     "longestStreak" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "content" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "xpReward" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "memoryLimitKb" INTEGER NOT NULL DEFAULT 262144,
ADD COLUMN     "rubric" TEXT,
ADD COLUMN     "timeLimitMs" INTEGER NOT NULL DEFAULT 2000;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "aiFeedback" TEXT,
ADD COLUMN     "aiScore" INTEGER,
ADD COLUMN     "contestId" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "memoryKb" INTEGER,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerId" TEXT,
ADD COLUMN     "runtimeMs" INTEGER,
ALTER COLUMN "source" DROP NOT NULL,
ALTER COLUMN "language" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Contest" ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "penaltyMinutes" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "requireFaceCheck" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RoomProgress" (
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomProgress_pkey" PRIMARY KEY ("userId","roomId")
);

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "XpSource" NOT NULL,
    "pathId" TEXT,
    "roomId" TEXT,
    "contestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestExercise" (
    "contestId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "points" INTEGER,

    CONSTRAINT "ContestExercise_pkey" PRIMARY KEY ("contestId","exerciseId")
);

-- Move existing contest exercises into the join table before dropping the column
INSERT INTO "ContestExercise" ("contestId", "exerciseId", "position")
SELECT "contestId", "id", ROW_NUMBER() OVER (PARTITION BY "contestId" ORDER BY "id")
FROM "Exercise"
WHERE "contestId" IS NOT NULL;

-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "contestId";

-- CreateTable
CREATE TABLE "ContestParticipant" (
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "score" INTEGER NOT NULL DEFAULT 0,
    "penaltyMinutes" INTEGER NOT NULL DEFAULT 0,
    "faceReferenceUrl" TEXT,
    "faceVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "ContestParticipant_pkey" PRIMARY KEY ("contestId","userId")
);

-- CreateTable
CREATE TABLE "ProctoringEvent" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ProctoringEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProctoringEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomProgress_roomId_idx" ON "RoomProgress"("roomId");

-- CreateIndex
CREATE INDEX "XpEvent_userId_createdAt_idx" ON "XpEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "XpEvent_pathId_userId_idx" ON "XpEvent"("pathId", "userId");

-- CreateIndex
CREATE INDEX "XpEvent_createdAt_idx" ON "XpEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContestExercise_contestId_position_key" ON "ContestExercise"("contestId", "position");

-- CreateIndex
CREATE INDEX "ContestParticipant_contestId_score_penaltyMinutes_idx" ON "ContestParticipant"("contestId", "score" DESC, "penaltyMinutes");

-- CreateIndex
CREATE INDEX "ProctoringEvent_contestId_userId_createdAt_idx" ON "ProctoringEvent"("contestId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "User_xp_idx" ON "User"("xp");

-- CreateIndex
CREATE INDEX "Submission_userId_exerciseId_idx" ON "Submission"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "Submission_contestId_createdAt_idx" ON "Submission"("contestId", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- AddForeignKey
ALTER TABLE "RoomProgress" ADD CONSTRAINT "RoomProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomProgress" ADD CONSTRAINT "RoomProgress_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "Path"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestExercise" ADD CONSTRAINT "ContestExercise_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestExercise" ADD CONSTRAINT "ContestExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestParticipant" ADD CONSTRAINT "ContestParticipant_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestParticipant" ADD CONSTRAINT "ContestParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctoringEvent" ADD CONSTRAINT "ProctoringEvent_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctoringEvent" ADD CONSTRAINT "ProctoringEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

