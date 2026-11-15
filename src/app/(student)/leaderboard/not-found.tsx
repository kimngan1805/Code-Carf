import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LeaderboardPathNotFound() {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border bg-background p-8 text-center sm:p-10">
      <h1 className="text-2xl font-bold">Không tìm thấy lộ trình</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Lộ trình bạn chọn không tồn tại hoặc chưa được công bố.
      </p>
      <Button asChild className="mt-6">
        <Link href="/leaderboard">Về bảng xếp hạng tổng</Link>
      </Button>
    </section>
  );
}
