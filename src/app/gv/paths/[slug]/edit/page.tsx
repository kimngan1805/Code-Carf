import { notFound } from "next/navigation";
import { CreatePathForm } from "@/features/paths/components/create-path-form";
import { PathBreadcrumb } from "@/features/paths/components/path-badges";
import { getManagedPath } from "@/features/paths/management";
import { AppError } from "@/lib/errors";

export default async function EditPathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const path = await getManagedPath(slug).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PathBreadcrumb
        items={[
          { label: "Quản lý lộ trình", href: "/gv/paths" },
          { label: path.title, href: `/gv/paths/${path.slug}` },
          { label: "Chỉnh sửa thông tin" },
        ]}
      />
      <header className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          Cập nhật lộ trình
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Chỉnh sửa thông tin lộ trình
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Các thông tin này hiển thị trên thẻ lộ trình ở danh mục học tập của
          học viên.
        </p>
      </header>
      <CreatePathForm path={path} />
    </div>
  );
}
