import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { MAX_DOCUMENTS } from "@/features/teacher-application/rules";
import { submitTeacherApplication } from "@/features/teacher-application/service";
import { fail, ok } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const user = await requireRole(Object.values(RoleName));
    const form = await request.formData();
    const uploads = form
      .getAll("documents")
      .filter((value): value is File => value instanceof File);
    if (uploads.length > MAX_DOCUMENTS)
      throw new AppError(
        400,
        "INVALID_DOCUMENTS",
        `Chỉ được tải tối đa ${MAX_DOCUMENTS} tệp.`,
      );

    const files = await Promise.all(
      uploads.map(async (file) => ({
        name: file.name,
        size: file.size,
        bytes: new Uint8Array(await file.arrayBuffer()),
      })),
    );
    const application = await submitTeacherApplication(
      user,
      {
        teachingLevel: form.get("teachingLevel"),
        province: form.get("province"),
        schoolId: form.get("schoolId") || undefined,
        schoolName: form.get("schoolName"),
      },
      files,
    );
    return ok({ id: application.id }, 201);
  } catch (error) {
    return fail(error);
  }
}
