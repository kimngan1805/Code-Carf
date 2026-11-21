CREATE TYPE "ExerciseReportStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');
ALTER TYPE "NotificationType" ADD VALUE 'REPORT_RESOLVED';

ALTER TABLE "ExerciseReport"
ADD COLUMN "status" "ExerciseReportStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN "resolution" VARCHAR(2000),
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "handlerId" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "ExerciseReport_roomId_status_createdAt_idx" ON "ExerciseReport"("roomId", "status", "createdAt");
CREATE INDEX "ExerciseReport_userId_createdAt_idx" ON "ExerciseReport"("userId", "createdAt");
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
