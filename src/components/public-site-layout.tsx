import Link from "next/link";
import { CodeXml } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

/** Khung chung cho các trang công khai (khám phá lộ trình, thi đấu): header landing và footer. */
export function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-4 py-8 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-bold text-primary"
          >
            <CodeXml className="size-5" aria-hidden />
            Code Carf
          </Link>
          <p className="text-xs text-muted-foreground">
            Học mỗi ngày. Tiến bộ qua từng thử thách.
          </p>
          <nav
            aria-label="Liên kết cuối trang"
            className="flex gap-5 text-sm text-primary"
          >
            <Link href="/lo-trinh">Khám phá lộ trình</Link>
            <Link href="/thi-dau">Khám phá thi đấu</Link>
            <Link href="/bang-xep-hang">Bảng xếp hạng</Link>
            <Link href="/login">Đăng nhập</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
