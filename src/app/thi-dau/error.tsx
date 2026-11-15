"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ShowcaseError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-primary">
        Chưa thể tải thông tin thi đấu
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        Kết nối có thể đang gián đoạn. Bạn thử tải lại sau một chút nhé.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()}>Thử lại</Button>
        <Button asChild variant="outline">
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </main>
  );
}
