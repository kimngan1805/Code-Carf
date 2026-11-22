import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center rounded-2xl border border-border/70 bg-background px-6 py-14 text-center">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground"
      >
        <SearchX className="size-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-foreground">
        Không tìm thấy nội dung bạn được quản lý
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Lộ trình hoặc bài học này có thể đã bị xóa mềm hoặc thuộc quyền quản lý
        của giảng viên khác.
      </p>
      <Button asChild className="mt-6 rounded-xl">
        <Link href="/gv/paths">
          <ArrowLeft className="size-4" aria-hidden />
          Về quản lý lộ trình
        </Link>
      </Button>
    </div>
  );
}
