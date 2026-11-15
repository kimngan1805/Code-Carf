CREATE TYPE "ExerciseReportKind" AS ENUM ('STATEMENT', 'TEST_CASE', 'AMBIGUOUS');

CREATE TABLE "ExerciseReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "kind" "ExerciseReportKind" NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExerciseReport_userId_exerciseId_createdAt_idx" ON "ExerciseReport"("userId", "exerciseId", "createdAt");
CREATE INDEX "ExerciseReport_exerciseId_createdAt_idx" ON "ExerciseReport"("exerciseId", "createdAt");
CREATE INDEX "ExerciseReport_roomId_createdAt_idx" ON "ExerciseReport"("roomId", "createdAt");

ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
