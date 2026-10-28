import { ApplicationStatus, RoleName, TeachingLevel } from "@prisma/client";
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
    // Applicants are guests until an admin approves; they cannot learn or teach yet.
    // onboardedAt marks the questions as done so they are not sent back to the wizard.
    const guest = await tx.role.findUniqueOrThrow({
      where: { name: RoleName.GUEST },
    });
    await tx.user.updateMany({
      where: { id: data.userId, role: { name: RoleName.STUDENT } },
      data: { roleId: guest.id, onboardedAt: new Date() },
    });
    return created;
  });
}

const applicantSelect = { select: { id: true, name: true, email: true } };

export function listApplications(status?: ApplicationStatus) {
  return db.teacherApplication.findMany({
    where: status ? { status } : undefined,
    // Oldest first so waiting applicants are reviewed in order.
    orderBy: { createdAt: "asc" },
    include: { user: applicantSelect, _count: { select: { documents: true } } },
  });
}

export function countApplicationsByStatus() {
  return db.teacherApplication.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
}

export function findApplicationDetail(id: string) {
  return db.teacherApplication.findUnique({
    where: { id },
    include: {
      user: applicantSelect,
      reviewer: { select: { name: true } },
      documents: { orderBy: { createdAt: "asc" } },
    },
  });
}

export function findDocument(applicationId: string, documentId: string) {
  return db.teacherApplicationDocument.findFirst({
    where: { id: documentId, applicationId },
  });
}

/**
 * Closes a pending application. Returns null when it was already decided, so two
 * admins can never both act on the same application.
 */
export function decideApplication(data: {
  id: string;
  reviewerId: string;
  status: "APPROVED" | "REJECTED";
  note: string | null;
}) {
  return db.$transaction(async (tx) => {
    const claimed = await tx.teacherApplication.updateMany({
      where: { id: data.id, status: ApplicationStatus.PENDING },
      data: {
        status: data.status,
        reviewerId: data.reviewerId,
        reviewNote: data.note,
        reviewedAt: new Date(),
      },
    });
    if (claimed.count === 0) return null;

    const application = await tx.teacherApplication.findUniqueOrThrow({
      where: { id: data.id },
      include: { user: applicantSelect },
    });
    if (data.status === ApplicationStatus.APPROVED) {
      const teacher = await tx.role.findUniqueOrThrow({
        where: { name: RoleName.TEACHER },
      });
      // Promote the guest applicant (STUDENT covers applications filed before GUEST
      // existed); never touch an admin or grader.
      await tx.user.updateMany({
        where: {
          id: application.userId,
          role: { name: { in: [RoleName.GUEST, RoleName.STUDENT] } },
        },
        data: { roleId: teacher.id },
      });
    }
    return application;
  });
}
