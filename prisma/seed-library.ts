/**
 * Đổ dữ liệu cho Kho tài liệu của giảng viên từ các lộ trình đã có. Thường không
 * cần chạy tay: trang kho tự làm việc này mỗi lần giảng viên mở (từng đợt nhỏ).
 * Script này làm hết một lần, ví dụ ngay sau khi seed lộ trình mới.
 *
 * - Mỗi lộ trình thành một danh mục cùng tên.
 * - Mỗi bài tập trong bài học có một bản trong kho (thẻ = tên bài học).
 * - Mỗi video YouTube trong nội dung bài học thành một bài giảng video.
 * - Mỗi file đính kèm được chép thành bài giảng trong kho.
 *
 * Chạy: npm run db:seed:library. Mặc định xử lý mọi giảng viên có lộ trình;
 * đặt SEED_TEACHER_EMAIL để chỉ làm cho một người; thêm `-- --no-files` để bỏ
 * qua bước chép file. Chạy lại nhiều lần an toàn: mỗi thứ chỉ vào kho một lần,
 * kể cả khi giảng viên đã xóa nó khỏi kho.
 */
import { PrismaClient } from "@prisma/client";
import { syncLibrary } from "../src/features/library/sync";

const prisma = new PrismaClient();
const withFiles = !process.argv.includes("--no-files");

async function main() {
  const email = process.env.SEED_TEACHER_EMAIL;
  const owners = await prisma.user.findMany({
    where: email ? { email } : { paths: { some: { deletedAt: null } } },
    select: { id: true, email: true, role: { select: { name: true } } },
  });
  if (owners.length === 0)
    throw new Error(
      email
        ? `Không tìm thấy tài khoản ${email}.`
        : "Chưa có giảng viên nào có lộ trình. Hãy chạy các seed lộ trình trước.",
    );
  for (const owner of owners) {
    if (!["TEACHER", "ADMIN"].includes(owner.role.name)) {
      console.warn(`Bỏ qua ${owner.email}: không phải giáo viên hay admin.`);
      continue;
    }
    const total = {
      exercises: 0,
      videos: 0,
      files: 0,
      fileErrors: [] as string[],
    };
    for (;;) {
      const step = await syncLibrary(prisma, owner.id, {
        batch: 100,
        withFiles,
      });
      total.exercises += step.exercises;
      total.videos += step.videos;
      total.files += step.files;
      total.fileErrors.push(...step.fileErrors);
      if (!step.more) break;
    }
    console.log(
      `${owner.email}: +${total.exercises} bài tập, +${total.videos} video, +${total.files} file${withFiles ? "" : " (bỏ qua file)"}.`,
    );
    for (const error of total.fileErrors)
      console.warn(`  Bỏ qua file ${error}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
