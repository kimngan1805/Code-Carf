ALTER TABLE "ProctoringEvent" ADD COLUMN "clientEventId" TEXT;
CREATE UNIQUE INDEX "ProctoringEvent_contestId_userId_clientEventId_key"
ON "ProctoringEvent"("contestId", "userId", "clientEventId");
