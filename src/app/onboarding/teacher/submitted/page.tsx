import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import {
  ArrowRight,
  BadgeCheck,
  CircleCheck,
  CircleDashed,
  CodeXml,
  Hourglass,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/features/auth/service";
import { APP_TIME_ZONE } from "@/features/progress/week-activity";
import { findLatestApplication } from "@/features/teacher-application/repository";
import {
  REVIEW_TIME,
  teachingLevelOptions,
} from "@/features/teacher-application/rules";
import { cn } from "@/lib/utils";

export const metadata = { title: "Hồ sơ giảng viên · Code Carf" };

const dayFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const statusInfo = {
  [ApplicationStatus.PENDING]: {
    label: "Đang chờ duyệt",
    tone: "bg-accent/10 text-accent-strong",
  },
  [ApplicationStatus.APPROVED]: {
    label: "Đã được duyệt",
    tone: "bg-success/10 text-success",
  },
  [ApplicationStatus.REJECTED]: {
    label: "Chưa được duyệt",
    tone: "bg-destructive/10 text-destructive",
  },
};

export default async function TeacherApplicationSubmittedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/onboarding");
  const application = await findLatestApplication(user.id);
  if (!application) redirect("/onboarding");

  const status = statusInfo[application.status];
  const level = teachingLevelOptions.find(
    (option) => option.value === application.teachingLevel,
  )?.label;
  const pending = application.status === ApplicationStatus.PENDING;
  const rejected = application.status === ApplicationStatus.REJECTED;
  const timeline = [
    {
      title: "Đã nộp hồ sơ",
      detail: `${dayFormat.format(application.createdAt)} lúc ${timeFormat.format(application.createdAt)}`,
      done: true,
    },
    {
      title: "Đang xét duyệt",
      detail: `Thường mất ${REVIEW_TIME}`,
      done: !pending,
      current: pending,
    },
    {
      title: "Có kết quả",
      detail: "Gửi qua email và hiện trên trang này",
      done: !pending,
    },
  ];

  return (
    <div className="min-h-dvh bg-gradient-to-b from-secondary/40 via-background to-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <span className="flex items-center gap-2.5 text-lg font-bold text-primary">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <CodeXml className="size-5" aria-hidden />
          </span>
          Code Carf
        </span>

        <main className="mt-10 rounded-3xl border border-border/70 bg-background p-6 shadow-sm sm:p-8">
          <span className="grid size-14 place-items-center rounded-2xl bg-secondary/60 text-primary">
            <BadgeCheck className="size-7" aria-hidden />
          </span>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Hồ sơ của bạn đã được ghi nhận
            </h1>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                status.tone,
              )}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-3 text-muted-foreground">
            Cảm ơn {user.name}! Đội ngũ Code Carf sẽ xem xét minh chứng và phản
            hồi trong{" "}
            <span className="font-semibold text-foreground">{REVIEW_TIME}</span>
            .
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-4 shrink-0" aria-hidden />
            Kết quả sẽ được gửi tới{" "}
            <span className="font-semibold text-foreground">{user.email}</span>
          </p>

          <ol className="mt-8 space-y-0">
            {timeline.map((item, index) => {
              const Icon = item.done
                ? CircleCheck
                : item.current
                  ? Hourglass
                  : CircleDashed;
              return (
                <li key={item.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-full",
                        item.done
                          ? "bg-primary text-primary-foreground"
                          : item.current
                            ? "bg-accent/15 text-accent-strong"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    {index < timeline.length - 1 && (
                      <span className="my-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <dl className="grid gap-3 rounded-2xl bg-muted/60 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Cấp giảng dạy</dt>
              <dd className="font-semibold">{level}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tỉnh / thành</dt>
              <dd className="font-semibold">{application.province}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Trường công tác</dt>
              <dd className="font-semibold">{application.schoolName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Minh chứng</dt>
              <dd className="font-semibold">
                {application._count.documents} tệp
              </dd>
            </div>
          </dl>

          {application.reviewNote && (
            <p className="mt-4 rounded-2xl border border-border/70 p-4 text-sm">
              <span className="font-semibold">Ghi chú từ người duyệt: </span>
              {application.reviewNote}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {rejected
                ? "Bạn có thể bổ sung minh chứng và nộp lại hồ sơ."
                : "Bạn sẽ nhận email khi hồ sơ được xử lý. Muốn học với vai trò học viên, hãy đăng ký một tài khoản riêng."}
            </p>
            {rejected && (
              <Button asChild className="shrink-0 rounded-xl">
                <Link href="/onboarding/teacher/apply">
                  Nộp lại hồ sơ <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
