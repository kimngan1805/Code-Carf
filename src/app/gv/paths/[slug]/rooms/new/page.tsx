import { notFound } from "next/navigation";
import { PathBreadcrumb } from "@/features/paths/components/path-badges";
import { getManagedPath } from "@/features/paths/management";
import { LessonEditor } from "@/features/rooms/components/lesson-editor";
import { AppError } from "@/lib/errors";

export default async function NewLessonPage({
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
          { label: "Thêm bài học" },
        ]}
      />
      <header className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          Nội dung bài học
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Thêm bài học mới
        </h1>
      </header>
      <LessonEditor pathSlug={path.slug} />
    </div>
  );
}
