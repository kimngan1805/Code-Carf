ALTER TABLE "Submission" ADD COLUMN "autoSubmitted" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ContestDraft" (
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "source" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'python',
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalSubmissionId" TEXT,
    CONSTRAINT "ContestDraft_pkey" PRIMARY KEY ("contestId", "userId")
);

CREATE UNIQUE INDEX "ContestDraft_finalSubmissionId_key" ON "ContestDraft"("finalSubmissionId");
ALTER TABLE "ContestDraft" ADD CONSTRAINT "ContestDraft_contestId_userId_fkey" FOREIGN KEY ("contestId", "userId") REFERENCES "ContestParticipant"("contestId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestDraft" ADD CONSTRAINT "ContestDraft_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContestDraft" ADD CONSTRAINT "ContestDraft_finalSubmissionId_fkey" FOREIGN KEY ("finalSubmissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
