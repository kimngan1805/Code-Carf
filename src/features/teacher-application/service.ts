import { randomUUID } from "node:crypto";
import { ApplicationStatus, RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getMailer } from "@/lib/mailer";
import { getStorage } from "@/lib/storage";
import {
  countApplicationsByStatus,
  createApplication,
  decideApplication,
  findApplicationDetail,
  findDocument,
  findOpenApplication,
  findSchool,
  listApplications,
} from "./repository";
import {
  applicationSchema,
  detectFileType,
  REVIEW_TIME,
  reviewSchema,
  validateDocuments,
  type UploadedDocument,
} from "./rules";

export async function submitTeacherApplication(
  user: { id: string; email: string; name: string },
  input: unknown,
  files: UploadedDocument[],
) {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_APPLICATION",
      parsed.error.issues[0].message,
    );
  const documentError = validateDocuments(files);
  if (documentError)
    throw new AppError(400, "INVALID_DOCUMENTS", documentError);

  if (await findOpenApplication(user.id))
    throw new AppError(
      409,
      "APPLICATION_EXISTS",
      "Bạn đã có hồ sơ đang được xét duyệt.",
    );

  const { teachingLevel, province } = parsed.data;
  let schoolName = parsed.data.schoolName;
  let schoolId: string | null = null;
  if (parsed.data.schoolId) {
    const school = await findSchool(parsed.data.schoolId);
    if (
      !school ||
      school.province !== province ||
      school.level !== teachingLevel
    )
      throw new AppError(
        400,
        "INVALID_SCHOOL",
        "Trường đã chọn không thuộc tỉnh hoặc cấp này.",
      );
    schoolId = school.id;
    schoolName = school.name;
  }

  // Store files first; remove them again if the database write fails.
  const storage = getStorage();
  const stored: {
    fileName: string;
    mimeType: string;
    size: number;
    storageKey: string;
  }[] = [];
  try {
    for (const file of files) {
      const type = detectFileType(file.bytes)!;
      const storageKey = `teacher-applications/${user.id}/${randomUUID()}.${type.ext}`;
      await storage.put(storageKey, Buffer.from(file.bytes));
      stored.push({
        fileName: file.name.slice(0, 200),
        mimeType: type.mime,
        size: file.size,
        storageKey,
      });
    }
    const application = await createApplication({
      userId: user.id,
      teachingLevel,
      province,
      schoolId,
      schoolName,
      documents: stored,
    });

    await getMailer()
      .send({
        to: user.email,
        subject: "Code Carf đã nhận hồ sơ giảng viên của bạn",
        text: `Chào ${user.name},\n\nCode Carf đã nhận hồ sơ xác minh giảng viên tại ${schoolName}. Chúng tôi sẽ xét duyệt trong ${REVIEW_TIME} và gửi kết quả qua email này.\n\nCode Carf`,
      })
      .catch((error) =>
        logger.error("teacher_application_email_failed", {
          error: String(error),
        }),
      );
    return application;
  } catch (error) {
    await Promise.all(stored.map((file) => storage.delete(file.storageKey)));
    throw error;
  }
}

export async function getApplicationQueue(status?: ApplicationStatus) {
  await requireRole([RoleName.ADMIN]);
  const [applications, counts] = await Promise.all([
    listApplications(status),
    countApplicationsByStatus(),
  ]);
  const totals = Object.fromEntries(
    counts.map((row) => [row.status, row._count._all]),
  ) as Partial<Record<ApplicationStatus, number>>;
  return { applications, totals };
}

export async function getApplicationForReview(id: string) {
  await requireRole([RoleName.ADMIN]);
  const application = await findApplicationDetail(id);
  if (!application)
    throw new AppError(404, "NOT_FOUND", "Không tìm thấy hồ sơ.");
  return application;
}

export async function readApplicationDocument(
  applicationId: string,
  documentId: string,
) {
  await requireRole([RoleName.ADMIN]);
  const document = await findDocument(applicationId, documentId);
  if (!document) throw new AppError(404, "NOT_FOUND", "Không tìm thấy tệp.");
  const bytes = await getStorage().get(document.storageKey);
  return { document, bytes };
}

export async function reviewTeacherApplication(id: string, input: unknown) {
  const admin = await requireRole([RoleName.ADMIN]);
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError(400, "INVALID_REVIEW", parsed.error.issues[0].message);
  const { decision, note } = parsed.data;
  const approved = decision === "approve";

  const application = await decideApplication({
    id,
    reviewerId: admin.id,
    status: approved ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED,
    note: note || null,
  });
  if (!application)
    throw new AppError(
      409,
      "ALREADY_REVIEWED",
      "Hồ sơ này đã được xử lý hoặc không tồn tại.",
    );

  const { user, schoolName } = application;
  const text = approved
    ? `Chào ${user.name},\n\nHồ sơ giảng viên tại ${schoolName} của bạn đã được duyệt. Hãy đăng nhập lại để bắt đầu tạo lộ trình và cuộc thi.${note ? `\n\nGhi chú: ${note}` : ""}\n\nCode Carf`
    : `Chào ${user.name},\n\nRất tiếc, hồ sơ giảng viên tại ${schoolName} chưa được duyệt.\n\nLý do: ${note}\n\nBạn có thể bổ sung minh chứng và nộp lại hồ sơ.\n\nCode Carf`;
  await getMailer()
    .send({
      to: user.email,
      subject: approved
        ? "Hồ sơ giảng viên của bạn đã được duyệt"
        : "Hồ sơ giảng viên của bạn chưa được duyệt",
      text,
    })
    .catch((error) =>
      logger.error("teacher_review_email_failed", { error: String(error) }),
    );
  return application;
}
