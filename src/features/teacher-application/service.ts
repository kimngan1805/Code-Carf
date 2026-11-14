import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getMailer } from "@/lib/mailer";
import { getStorage } from "@/lib/storage";
import {
  createApplication,
  findOpenApplication,
  findSchool,
} from "./repository";
import {
  applicationSchema,
  detectFileType,
  REVIEW_TIME,
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
