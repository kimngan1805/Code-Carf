import { ExerciseEditor } from "@/features/exercises/components/exercise-editor";
import { PathBreadcrumb } from "@/features/paths/components/path-badges";
import { getLibraryCategories } from "@/features/library/service";

export const metadata = { title: "Bài tập mới · Kho tài liệu" };

export default async function NewLibraryExercisePage({
  searchParams,
}: {
  searchParams: Promise<{ danhMuc?: string }>;
}) {
  const categories = await getLibraryCategories();
  const { danhMuc } = await searchParams;
  const categoryId = categories.some((item) => item.id === danhMuc)
    ? (danhMuc ?? null)
    : null;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PathBreadcrumb
        items={[
          { label: "Kho tài liệu", href: "/gv/library" },
          { label: "Bài tập mới" },
        ]}
      />
      <header className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          Kho tài liệu
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Thêm bài tập vào kho
        </h1>
        <p className="text-sm text-muted-foreground">
          Bài tập trong kho chưa thuộc bài học nào. Dùng &quot;Chọn từ kho&quot;
          khi soạn bài học để đưa vào.
        </p>
      </header>
      <ExerciseEditor
        library={{
          categories,
          meta: {
            categoryId,
            tags: [],
            status: "READY",
            visibility: "PRIVATE",
          },
        }}
      />
    </div>
  );
}
