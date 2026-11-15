import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagedPath } from "@/features/paths/management";
import { CreatePathForm } from "@/features/paths/components/create-path-form";
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
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href={`/gv/paths/${path.slug}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← {path.title}
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-primary">
          Chỉnh sửa thông tin lộ trình
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thông tin này hiển thị trên thẻ lộ trình ở trang cộng đồng của học
          viên.
        </p>
      </header>
      <CreatePathForm path={path} />
    </div>
  );
}
