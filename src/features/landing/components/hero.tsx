import Link from "next/link";
import { CodeXml, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-secondary/50 via-background to-secondary/30">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="text-4xl leading-tight font-bold text-primary sm:text-5xl">
            Học lập trình
            <span className="block text-accent">Thử thách bản thân</span>
            <span className="block">Cùng Code Carf</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Nền tảng học và thi lập trình trực tuyến với lộ trình rõ ràng, bài
            tập thực hành, thi đấu hấp dẫn và cộng đồng lập trình viên năng
            động.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/hv/paths">Bắt đầu học ngay</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full bg-background px-8"
            >
              <Link href="/thi-dau">Khám phá thi đấu</Link>
            </Button>
          </div>
        </div>

        <HeroIllustration />
      </div>
    </section>
  );
}

const codeLines = [
  "w-2/3 bg-highlight",
  "w-1/2 bg-secondary",
  "w-3/4 bg-highlight/70",
  "w-2/5 bg-secondary",
  "w-3/5 bg-highlight",
];

function HeroIllustration() {
  return (
    <div aria-hidden className="relative mx-auto h-80 w-full max-w-md sm:h-96">
      <Sparkles className="absolute top-6 left-0 size-8 text-primary" />
      <Sparkles className="absolute bottom-16 left-6 size-6 text-accent" />
      <Sparkles className="absolute top-1/2 right-0 size-5 text-highlight" />

      {/* Code window */}
      <div className="absolute top-4 left-8 w-64 -rotate-3 rounded-xl bg-primary p-5 shadow-xl sm:w-72">
        <div className="mb-4 flex gap-1.5">
          <span className="size-2.5 rounded-full bg-accent" />
          <span className="size-2.5 rounded-full bg-secondary" />
          <span className="size-2.5 rounded-full bg-highlight" />
        </div>
        <div className="space-y-3">
          {codeLines.map((line, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="h-1.5 w-4 rounded bg-primary-foreground/30" />
              <span className={`h-1.5 rounded ${line}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Trophy */}
      <div className="absolute top-0 right-6 grid size-16 place-items-center rounded-2xl bg-background shadow-lg">
        <Trophy className="size-9 text-accent" />
      </div>

      {/* Laptop */}
      <div className="absolute right-4 bottom-4 left-16">
        <div className="mx-auto grid h-32 w-full place-items-center rounded-t-xl border-4 border-primary bg-primary/90 sm:h-40">
          <CodeXml className="size-12 text-primary-foreground" />
        </div>
        <div className="mx-auto h-3 w-[110%] -translate-x-[4.5%] rounded-b-xl bg-foreground/80" />
      </div>

      {/* Level up bubble */}
      <div className="absolute right-0 bottom-36 rotate-6 rounded-2xl rounded-bl-sm bg-primary px-4 py-2 text-lg leading-tight font-bold text-primary-foreground shadow-lg sm:bottom-44">
        Level
        <br />
        Up!
      </div>
    </div>
  );
}
