import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Braces,
  Check,
  CodeXml,
  Flag,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShowcaseIntro() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-br from-secondary/40 via-background to-secondary/30">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" aria-hidden />
            Đấu trí bằng từng dòng code
          </p>
          <h1 className="mt-6 text-4xl leading-[1.15] font-bold tracking-tight text-primary sm:text-5xl lg:text-6xl">
            Viết code.
            <br />
            Vượt giới hạn.
            <br />
            <span className="text-accent-strong">Chinh phục thử thách.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-muted-foreground">
            Biến kiến thức thành trải nghiệm thi đấu. Khám phá các cuộc thi lập
            trình trên Code Carf, rèn tư duy và tìm ra phiên bản tốt hơn của
            chính mình.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full">
              <a href="#kham-pha">
                Khám phá cuộc thi
                <ArrowDown className="size-4" aria-hidden />
              </a>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-full">
              <a href="#cach-tham-gia">
                Thi đấu như thế nào?
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </Button>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="size-4 text-success" aria-hidden />
            Tự do khám phá · Đăng nhập khi sẵn sàng tham gia
          </p>
        </div>
        <div
          aria-hidden
          className="relative mx-auto flex min-h-80 w-full max-w-md items-center justify-center sm:min-h-96"
        >
          <div className="absolute size-72 rounded-full border border-primary/10 sm:size-80" />
          <div className="absolute size-56 rounded-full border border-primary/10 sm:size-64" />
          <div className="relative w-full rotate-[-4deg] rounded-3xl border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-accent" />
                <span className="size-2.5 rounded-full bg-secondary" />
                <span className="size-2.5 rounded-full bg-primary" />
              </div>
              <CodeXml className="size-5 text-primary" />
            </div>
            <div className="py-6 font-mono text-sm leading-8">
              <p className="text-muted-foreground">
                {"// Một thử thách. Nhiều cách giải."}
              </p>
              <p className="text-primary">while (you.keepLearning) {"{"}</p>
              <p className="pl-5 text-foreground">think();</p>
              <p className="pl-5 text-foreground">code();</p>
              <p className="pl-5 text-accent-strong">grow();</p>
              <p className="text-primary">{"}"}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
              <Check className="size-4" />
              Sẵn sàng cho thử thách tiếp theo
            </div>
          </div>
          <div className="absolute -top-1 right-0 grid size-24 rotate-12 place-items-center rounded-3xl bg-primary shadow-lg">
            <Trophy
              className="size-12 text-primary-foreground"
              strokeWidth={1.5}
            />
          </div>
          <div className="absolute bottom-2 left-0 grid size-16 -rotate-12 place-items-center rounded-2xl border bg-background shadow-lg">
            <Braces className="size-8 text-accent-strong" />
          </div>
        </div>
      </div>
    </section>
  );
}
const steps = [
  {
    icon: Flag,
    title: "Chọn thử thách",
    description:
      "Khám phá giới thiệu, lịch đăng ký và lịch thi để tìm cuộc thi phù hợp.",
  },
  {
    icon: CodeXml,
    title: "Đăng ký và viết code",
    description:
      "Đăng nhập, đăng ký trong thời gian cho phép và bắt đầu lượt thi khi sẵn sàng.",
  },
  {
    icon: Trophy,
    title: "Nhìn lại kết quả",
    description:
      "Xem kết quả của mình, rút kinh nghiệm và tiếp tục chinh phục thử thách mới.",
  },
];
export function ShowcaseGuide() {
  return (
    <>
      <section
        id="cach-tham-gia"
        aria-labelledby="guide-title"
        className="scroll-mt-24 rounded-3xl bg-muted/60 px-6 py-10 sm:p-10"
      >
        <p className="text-xs font-bold tracking-[0.2em] text-accent-strong uppercase">
          TỪ TÒ MÒ ĐẾN CHINH PHỤC
        </p>
        <h2 id="guide-title" className="mt-3 text-3xl font-bold text-primary">
          Bắt đầu với ba bước
        </h2>
        <div className="mt-9 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title}>
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-background text-primary">
                  <step.icon className="size-6" aria-hidden />
                </span>
                <span className="font-mono text-sm text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section
        aria-labelledby="faq-title"
        className="mx-auto max-w-3xl py-16 sm:py-20"
      >
        <h2
          id="faq-title"
          className="text-center text-3xl font-bold text-primary"
        >
          Trước khi bạn bắt đầu
        </h2>
        <div className="mt-8 divide-y rounded-2xl border px-5 sm:px-7">
          {[
            [
              "Tôi có cần tài khoản để xem cuộc thi không?",
              "Bạn có thể xem giới thiệu và lịch các cuộc thi ngay tại đây. Khi muốn đăng ký hoặc vào thi, bạn cần đăng nhập bằng tài khoản học viên.",
            ],
            [
              "Thời gian đăng ký có phải thời gian làm bài không?",
              "Đây là hai mốc riêng. Hãy đăng ký trong khung đăng ký và vào thi trong lịch làm bài. Thời lượng được tính riêng cho mỗi thí sinh từ khi bấm bắt đầu và không vượt quá giờ đóng làm bài.",
            ],
            [
              "Tôi có thể xem đề trước khi tham gia không?",
              "Trang giới thiệu chỉ hiển thị thông tin công khai như mô tả, số đề và lịch thi. Nội dung đề nằm trong khu vực làm bài theo điều kiện của cuộc thi.",
            ],
          ].map(([question, answer]) => (
            <details key={question} className="group py-5">
              <summary className="cursor-pointer rounded text-sm leading-6 font-semibold focus-visible:outline-2 focus-visible:outline-ring">
                {question}
              </summary>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </section>
      <section className="mb-16 rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground sm:p-12">
        <Sparkles className="mx-auto size-7 text-secondary" aria-hidden />
        <h2 className="mt-4 text-3xl font-bold">
          Thử thách tiếp theo bắt đầu từ bạn.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-primary-foreground/80">
          Tạo tài khoản để sẵn sàng đăng ký các cuộc thi và bắt đầu hành trình
          lập trình cùng Code Carf.
        </p>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="mt-7 rounded-full"
        >
          <Link href="/register">
            Bắt đầu hành trình
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </section>
    </>
  );
}
