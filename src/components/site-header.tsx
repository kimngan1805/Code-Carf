import Link from "next/link";
import { CodeXml, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/lo-trinh", label: "Khám phá lộ trình" },
  { href: "/thi-dau", label: "Thi đấu" },
  { href: "/bang-xep-hang", label: "Bảng xếp hạng" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-primary"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <CodeXml className="size-5" aria-hidden />
          </span>
          Code Carf
        </Link>

        <nav aria-label="Chính" className="hidden md:block">
          <ul className="flex items-center gap-7 text-sm font-medium">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Tìm kiếm" asChild>
            <Link href="/hv/search">
              <Search className="size-5" aria-hidden />
            </Link>
          </Button>
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Đăng nhập</Link>
          </Button>
          <Button asChild className="rounded-full px-5">
            <Link href="/register">Đăng ký</Link>
          </Button>

          <details className="relative md:hidden">
            <summary
              aria-label="Mở menu"
              className="grid size-10 cursor-pointer list-none place-items-center rounded-md text-primary hover:bg-muted [&::-webkit-details-marker]:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </summary>
            <nav
              aria-label="Menu di động"
              className="absolute right-0 mt-2 w-56 rounded-lg border bg-background p-2 shadow-lg"
            >
              {[...navItems, { href: "/login", label: "Đăng nhập" }].map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
