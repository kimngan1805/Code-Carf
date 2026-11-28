-- CreateTable
CREATE TABLE "ContestStage" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "exerciseCount" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,

    CONSTRAINT "ContestStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestStageAttempt" (
    "stageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestStageAttempt_pkey" PRIMARY KEY ("stageId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContestStage_contestId_number_key" ON "ContestStage"("contestId", "number");

-- CreateIndex
CREATE INDEX "ContestStageAttempt_userId_idx" ON "ContestStageAttempt"("userId");

-- AddForeignKey
ALTER TABLE "ContestStage" ADD CONSTRAINT "ContestStage_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestStageAttempt" ADD CONSTRAINT "ContestStageAttempt_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ContestStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestStageAttempt" ADD CONSTRAINT "ContestStageAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
