import { RoleName, TeachingLevel } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { isProvince } from "@/features/teacher-application/provinces";
import { listSchools } from "@/features/teacher-application/repository";
import { fail, ok } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    await requireRole(Object.values(RoleName));
    const params = new URL(request.url).searchParams;
    const province = params.get("province") ?? "";
    const level = params.get("level") as TeachingLevel | null;
    if (
      !isProvince(province) ||
      !level ||
      !Object.values(TeachingLevel).includes(level)
    )
      throw new AppError(
        400,
        "INVALID_QUERY",
        "province and level are required",
      );
    return ok(await listSchools(province, level));
  } catch (error) {
    return fail(error);
  }
}
