import Link from "next/link";
import { notFound } from "next/navigation";
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
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Link
        href={`/gv/paths/${path.slug}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← {path.title}
      </Link>
      <h1 className="text-2xl font-bold text-primary">Thêm bài học</h1>
      <LessonEditor pathSlug={path.slug} />
    </div>
  );
}
