import Link from "next/link";
import { ArrowRight, CodeXml, Flag, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

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
