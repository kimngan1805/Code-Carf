import { requireRole } from "@/features/auth/service";
import { CreatePathForm } from "@/features/paths/components/create-path-form";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";

export default async function NewPathPage() {
  await requireRole(["TEACHER", "ADMIN"]).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401) redirect("/login?callbackUrl=/gv/paths/new");
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary">Tạo lộ trình</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lộ trình mới được lưu dưới dạng bản nháp để bạn chuẩn bị nội dung
          trước khi xuất bản.
        </p>
      </header>
      <CreatePathForm />
    </div>
  );
}
