import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold text-primary">Code Carf</h1>
      <p className="mt-4 text-muted-foreground">
        Nền tảng học và thi lập trình.
      </p>
      <Button asChild className="mt-6">
        <Link href="/login">Đăng nhập</Link>
      </Button>
    </main>
  );
}
