import { ApplicationStatus, TeachingLevel } from "@prisma/client";
import { db } from "@/lib/db";

export function listSchools(province: string, level: TeachingLevel) {
  return db.school.findMany({
    where: { province, level },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function findSchool(id: string) {
  return db.school.findUnique({ where: { id } });
}

/** A pending or approved application blocks a new one. */
export function findOpenApplication(userId: string) {
  return db.teacherApplication.findFirst({
    where: {
      userId,
      status: { in: [ApplicationStatus.PENDING, ApplicationStatus.APPROVED] },
    },
  });
}

export function findLatestApplication(userId: string) {
  return db.teacherApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { documents: true } } },
  });
}

export function createApplication(data: {
  userId: string;
  teachingLevel: TeachingLevel;
  province: string;
  schoolId: string | null;
  schoolName: string;
  documents: {
    fileName: string;
    mimeType: string;
    size: number;
    storageKey: string;
  }[];
}) {
  const { documents, ...application } = data;
  return db.$transaction(async (tx) => {
    const created = await tx.teacherApplication.create({
      data: { ...application, documents: { create: documents } },
    });
    // Applicants can use the app as a learner while they wait for review.
    await tx.user.updateMany({
      where: { id: data.userId, onboardedAt: null },
      data: { onboardedAt: new Date() },
    });
    return created;
  });
}
