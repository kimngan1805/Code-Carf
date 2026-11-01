ALTER TABLE "Contest" ADD COLUMN "examStartsAt" TIMESTAMP(3), ADD COLUMN "examEndsAt" TIMESTAMP(3);
UPDATE "Contest" SET "examStartsAt" = "endsAt", "examEndsAt" = "endsAt" + "durationMinutes" * INTERVAL '1 minute' WHERE "endsAt" IS NOT NULL;
-- Preserve previous attempts made under the old immediate-start model.
WITH attempts AS (
  SELECT "contestId", MIN("startedAt") AS first_start, MAX("deadlineAt") AS last_deadline
  FROM "ContestParticipant" WHERE "startedAt" IS NOT NULL GROUP BY "contestId"
)
UPDATE "Contest" c SET
  "startsAt" = LEAST(c."startsAt", a.first_start - INTERVAL '1 millisecond'),
  "endsAt" = LEAST(c."endsAt", a.first_start),
  "examStartsAt" = LEAST(c."examStartsAt", a.first_start),
  "examEndsAt" = GREATEST(c."examEndsAt", a.last_deadline)
FROM attempts a WHERE c.id = a."contestId";
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_exam_window_check" CHECK (
  ("examStartsAt" IS NULL AND "examEndsAt" IS NULL) OR
  ("examStartsAt" IS NOT NULL AND "examEndsAt" IS NOT NULL AND "examEndsAt" > "examStartsAt")
);
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_registration_before_exam_check" CHECK (
  "endsAt" IS NULL OR "examStartsAt" IS NULL OR "endsAt" <= "examStartsAt"
);
