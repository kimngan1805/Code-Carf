import { ApplicationStatus } from "@prisma/client";
import { db } from "@/lib/db";

export function countUsers() {
  return db.user.count();
}

export function countPendingTeacherApplications() {
  return db.teacherApplication.count({
    where: { status: ApplicationStatus.PENDING },
  });
}
