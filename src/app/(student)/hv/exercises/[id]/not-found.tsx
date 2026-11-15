import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ExerciseNotFound() {
  return (
    <section className="mx-auto max-w-3xl space-y-4 rounded-2xl border bg-background p-6">
      <h1 className="text-xl font-bold">Không tìm thấy bài tập</h1>
      <p className="text-muted-foreground">
        Bài tập không tồn tại, không phải bài lập trình hoặc lộ trình chưa được
        xuất bản.
      </p>
      <Button asChild>
        <Link href="/hv/paths">Về lộ trình học</Link>
      </Button>
    </section>
  );
}
