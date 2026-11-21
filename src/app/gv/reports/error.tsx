"use client";
import { Button } from "@/components/ui/button";
export default function ReportError({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="space-y-3">
      <p>Chưa thể tải báo lỗi. Vui lòng thử lại.</p>
      <Button onClick={retry}>Thử lại</Button>
    </div>
  );
}
