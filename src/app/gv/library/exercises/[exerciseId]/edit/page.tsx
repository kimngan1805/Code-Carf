import { notFound } from "next/navigation";
import { ExerciseEditor } from "@/features/exercises/components/exercise-editor";
import { PathBreadcrumb } from "@/features/paths/components/path-badges";
import {
  getLibraryCategories,
  getLibraryExercise,
} from "@/features/library/service";
import { AppError } from "@/lib/errors";

export const metadata = { title: "Sửa bài tập · Kho tài liệu" };

export default async function EditLibraryExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const categories = await getLibraryCategories();
  const exercise = await getLibraryExercise(exerciseId).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PathBreadcrumb
        items={[
          { label: "Kho tài liệu", href: "/gv/library" },
          { label: exercise.title },
        ]}
      />
      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Sửa bài tập trong kho
        </h1>
        <p className="text-sm text-muted-foreground">
          Thay đổi chỉ áp dụng cho bản trong kho. Các bài học đã dùng bài này
          vẫn giữ bản cũ.
        </p>
      </header>
      <ExerciseEditor
        exercise={exercise}
        library={{
          categories,
          meta: {
            categoryId: exercise.libraryCategoryId,
            tags: exercise.libraryTags,
            status: exercise.libraryStatus,
            visibility: exercise.libraryVisibility,
          },
        }}
      />
    </div>
  );
}
