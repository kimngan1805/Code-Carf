ALTER TABLE "Contest" ADD COLUMN "violationThreshold" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_violationThreshold_check" CHECK ("violationThreshold" BETWEEN 1 AND 100);
ALTER TABLE "ContestParticipant" ADD COLUMN "violationCount" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "flaggedAt" TIMESTAMP(3);
ALTER TABLE "Submission" ADD COLUMN "flaggedForReview" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "ContestParticipant_contestId_flaggedAt_idx" ON "ContestParticipant"("contestId", "flaggedAt");

UPDATE "ContestParticipant" p SET "violationCount" = (
  SELECT COUNT(*) FROM "ProctoringEvent" e
  WHERE e."contestId" = p."contestId" AND e."userId" = p."userId" AND e.type IN ('TAB_SWITCH', 'PASTE')
);
UPDATE "ContestParticipant" p SET "flaggedAt" = CURRENT_TIMESTAMP
FROM "Contest" c WHERE c.id = p."contestId" AND p."violationCount" > c."violationThreshold";
UPDATE "Submission" s SET "flaggedForReview" = true FROM "ContestParticipant" p
WHERE s."contestId" = p."contestId" AND s."userId" = p."userId" AND p."flaggedAt" IS NOT NULL;
