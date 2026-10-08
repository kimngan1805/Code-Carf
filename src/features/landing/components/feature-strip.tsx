import { BookOpen, CodeXml, ShieldCheck, Trophy } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Lộ trình học bài bản",
    description: "Từ cơ bản đến nâng cao",
    tone: "bg-secondary text-primary",
  },
  {
    icon: CodeXml,
    title: "Chấm bài tự động",
    description: "Nhận kết quả ngay lập tức",
    tone: "bg-primary text-primary-foreground",
  },
  {
    icon: Trophy,
    title: "Thi đấu lập trình",
    description: "Theo thời gian thực, xếp hạng",
    tone: "bg-accent text-accent-foreground",
  },
  {
    icon: ShieldCheck,
    title: "Chống gian lận",
    description: "Đảm bảo công bằng, minh bạch",
    tone: "bg-primary text-primary-foreground",
  },
];

export function FeatureStrip() {
  return (
    <section aria-label="Tính năng nổi bật" className="border-y bg-background">
      <ul className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, description, tone }) => (
          <li
            key={title}
            className="flex items-center gap-4 bg-background px-6 py-8"
          >
            <span
              className={`grid size-12 shrink-0 place-items-center rounded-xl ${tone}`}
            >
              <Icon className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold text-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
