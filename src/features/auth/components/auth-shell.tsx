import Link from "next/link";
import { Check, CodeXml, Flame, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

const tabs: { mode: Mode; href: string; label: string }[] = [
  { mode: "login", href: "/login", label: "Đăng nhập" },
  { mode: "register", href: "/register", label: "Đăng ký" },
];

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2.5 text-lg font-bold",
        inverted ? "text-primary-foreground" : "text-primary",
      )}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl",
          inverted
            ? "bg-primary-foreground/15 ring-1 ring-primary-foreground/25"
            : "bg-primary text-primary-foreground",
        )}
      >
        <CodeXml className="size-5" aria-hidden />
      </span>
      Code Carf
    </Link>
  );
}

export function AuthShell({
  mode,
  title,
  subtitle,
  children,
}: {
  mode: Mode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <main className="relative flex flex-col px-4 py-8 sm:px-8">
        {/* Soft glow behind the form on small screens, where the brand panel is hidden. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-secondary/40 to-transparent lg:hidden"
        />
        <div className="relative lg:hidden">
          <Logo />
        </div>

        <div className="relative m-auto w-full max-w-[400px] py-10">
          <nav
            aria-label="Chọn đăng nhập hoặc đăng ký"
            className="mb-10 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-semibold"
          >
            {tabs.map((tab) => (
              <Link
                key={tab.mode}
                href={tab.href}
                aria-current={tab.mode === mode ? "page" : undefined}
                className={cn(
                  "rounded-lg py-2.5 text-center transition-colors",
                  tab.mode === mode
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>

        <p className="relative text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Code Carf · Nền tảng học và thi lập trình
        </p>
      </main>
    </div>
  );
}

const weekDone = [true, true, true, true, true, true, false];

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-hover p-12 text-primary-foreground lg:flex lg:flex-col">
      {/* Light blobs and a faint grid give the flat blue some depth. */}
      <div
        aria-hidden
        className="absolute -top-32 -right-24 size-[28rem] rounded-full bg-highlight/35 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-secondary/25 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] opacity-[0.12] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:44px_44px]"
      />

      <div className="relative">
        <Logo inverted />
      </div>

      <div className="relative my-auto max-w-lg">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold ring-1 ring-primary-foreground/20">
          <Sparkles className="size-3.5" aria-hidden />
          Học · Luyện · Thi đấu
        </p>
        <p className="mt-6 text-4xl leading-[1.15] font-bold tracking-tight xl:text-5xl">
          Viết code mỗi ngày,
          <span className="block text-secondary">lên level mỗi tuần.</span>
        </p>
        <p className="mt-4 max-w-md text-primary-foreground/75">
          Lộ trình rõ ràng, chấm bài tức thì và những cuộc thi để bạn biết mình
          đang ở đâu.
        </p>

        <ProductPreview />
      </div>
    </aside>
  );
}

const glass =
  "rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 backdrop-blur-md shadow-2xl shadow-primary-hover/40";

function ProductPreview() {
  return (
    <div aria-hidden className="relative mt-12 h-64">
      {/* Code card */}
      <div
        className={cn(
          glass,
          "absolute top-0 left-0 w-80 p-5 font-mono text-[13px] leading-6",
        )}
      >
        <div className="mb-3 flex gap-1.5">
          <span className="size-2.5 rounded-full bg-accent" />
          <span className="size-2.5 rounded-full bg-secondary" />
          <span className="size-2.5 rounded-full bg-highlight" />
        </div>
        <p>
          <span className="text-secondary">function</span>{" "}
          <span className="text-highlight">sum</span>(a, b) {"{"}
        </p>
        <p className="pl-4">
          <span className="text-secondary">return</span> a + b;
        </p>
        <p>{"}"}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary-foreground/15 px-2 py-0.5 font-sans text-xs font-semibold">
          <Check className="size-3.5" aria-hidden />
          3/3 test case đạt
        </p>
      </div>

      {/* Level card */}
      <div className={cn(glass, "absolute top-6 right-0 w-56 p-4")}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent">
            <Trophy className="size-5" />
          </span>
          <div>
            <p className="text-xs text-primary-foreground/70">Lập trình viên</p>
            <p className="font-bold">Level 3</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-primary-foreground/15">
          <div className="h-full w-1/4 rounded-full bg-secondary" />
        </div>
        <p className="mt-2 text-right text-xs text-primary-foreground/70">
          +50 XP hôm nay
        </p>
      </div>

      {/* Streak card */}
      <div className={cn(glass, "absolute right-10 bottom-0 w-64 p-4")}>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Flame className="size-4 text-accent" />
          Chuỗi 6 ngày
        </p>
        <div className="mt-3 flex justify-between">
          {weekDone.map((done, index) => (
            <span
              key={index}
              className={cn(
                "size-6 rounded-full",
                done
                  ? "bg-secondary"
                  : "ring-2 ring-primary-foreground/30 ring-inset",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
