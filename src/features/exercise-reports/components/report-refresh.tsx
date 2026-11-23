"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReportRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) start(() => router.refresh());
    }, 30000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => start(() => router.refresh())}
    >
      {pending ? "Đang tải..." : "Cập nhật"}
    </Button>
  );
}
