"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="space-y-4">
      <p>Không thể tải lộ trình. Vui lòng thử lại.</p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
