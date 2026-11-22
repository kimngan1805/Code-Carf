import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/service";
import { CreatePathForm } from "@/features/paths/components/create-path-form";
import { PathBreadcrumb } from "@/features/paths/components/path-badges";
import { AppError } from "@/lib/errors";

export const metadata = {
  title: "Tạo lộ trình mới · Code Carf",
};

export default async function NewPathPage() {
  await requireRole(["TEACHER", "ADMIN"]).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401) redirect("/login?callbackUrl=/gv/paths/new");
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PathBreadcrumb
        items={[
          { label: "Quản lý lộ trình", href: "/gv/paths" },
          { label: "Tạo lộ trình mới" },
        ]}
      />
      <header className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          Khởi tạo nội dung
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Tạo lộ trình mới
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Lộ trình mới được lưu ở trạng thái bản nháp để bạn chuẩn bị bài học và
          bài tập trước khi xuất bản cho học viên.
        </p>
      </header>
      <CreatePathForm />
    </div>
  );
}
