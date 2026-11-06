-- Existing startsAt/endsAt remain the registration window.
-- Do not start existing registrations or reset completed attempts during migration.
ALTER TABLE "Contest" ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_durationMinutes_check" CHECK ("durationMinutes" > 0);
ALTER TABLE "ContestParticipant" ADD COLUMN "startedAt" TIMESTAMP(3), ADD COLUMN "deadlineAt" TIMESTAMP(3);
ALTER TABLE "ContestParticipant" ADD CONSTRAINT "ContestParticipant_attempt_times_check" CHECK (
    ("startedAt" IS NULL AND "deadlineAt" IS NULL) OR
    ("startedAt" IS NOT NULL AND "deadlineAt" IS NOT NULL AND "deadlineAt" > "startedAt")
);
