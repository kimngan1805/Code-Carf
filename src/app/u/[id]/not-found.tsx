import Link from "next/link";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicProfileNotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-[1.75rem] border border-border/60 bg-background p-6 text-center sm:p-8">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-primary">
        <UserX className="size-7" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-semibold sm:text-2xl">
        Không tìm thấy hồ sơ học viên
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tài khoản này không tồn tại hoặc không có hồ sơ học viên công khai.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline" className="rounded-full px-5">
          <Link href="/hv/paths">Xem lộ trình học</Link>
        </Button>
        <Button asChild className="rounded-full px-5">
          <Link href="/hv/dashboard">Về trang chủ</Link>
        </Button>
      </div>
    </div>
  );
}
