import Link from "next/link";
import { redirect } from "next/navigation";
import { getManagedPaths } from "@/features/paths/management";
import { PathUnlockSetting } from "@/features/paths/components/path-unlock-setting";
import { AppError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function ManagedPathsPage() {
  const paths = await getManagedPaths().catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401) redirect("/login?callbackUrl=/gv/paths");
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Quản lý lộ trình</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tạo lộ trình và thiết lập cách học viên mở các bài học.
          </p>
        </div>
        <Button asChild>
          <Link href="/gv/paths/new">
            <Plus aria-hidden className="size-4" />
            Tạo lộ trình
          </Link>
        </Button>
      </header>
      {paths.length === 0 && (
        <p className="rounded-xl border bg-background p-4">
          Bạn chưa có lộ trình để quản lý.
        </p>
      )}
      <ul className="space-y-4">
        {paths.map((path) => (
          <li
            key={path.id}
            className="space-y-4 rounded-2xl border bg-background p-4 sm:p-6"
          >
            <div className="space-y-1">
              <h2 className="text-lg font-semibold break-words">
                {path.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {path.published ? "Đã xuất bản" : "Bản nháp"} ·{" "}
                {path._count.rooms} Room
              </p>
            </div>
            <PathUnlockSetting
              pathId={path.id}
              initialEnabled={path.sequentialUnlock}
            />
            <Link
              href={`/gv/paths/${path.slug}`}
              className="inline-block text-sm font-semibold text-primary hover:underline"
            >
              Xem lộ trình
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
