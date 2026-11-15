import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ContestNotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-3 text-2xl font-bold text-primary">
        Không tìm thấy cuộc thi
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        Cuộc thi chưa được công bố hoặc đường dẫn không còn tồn tại.
      </p>
      <Button asChild className="mt-7 rounded-full">
        <Link href="/thi-dau">Khám phá cuộc thi khác</Link>
      </Button>
    </main>
  );
}
