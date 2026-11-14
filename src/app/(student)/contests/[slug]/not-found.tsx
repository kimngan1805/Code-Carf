import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ContestNotFound() {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border bg-background p-10 text-center">
      <h1 className="text-2xl font-bold">Không tìm thấy cuộc thi</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Cuộc thi không tồn tại hoặc chưa được công bố.
      </p>
      <Button asChild className="mt-6">
        <Link href="/contests">Về danh sách cuộc thi</Link>
      </Button>
    </section>
  );
}
