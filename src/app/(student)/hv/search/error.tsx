"use client";

import { Button } from "@/components/ui/button";

export default function SearchError({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="space-y-4">
      <p>Không thể tải kết quả tìm kiếm. Vui lòng thử lại.</p>
      <Button onClick={retry}>Thử lại</Button>
    </div>
  );
}
