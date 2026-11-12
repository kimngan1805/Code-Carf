"use client";

import { useActionState, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CodeXml,
  GraduationCap,
  Presentation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import { completeStudentOnboarding, type OnboardingState } from "../actions";
import {
  dailyOptions,
  goalOptions,
  languageOptions,
  levelOptions,
  type Option,
} from "../questions";

type Role = "student" | "teacher";

interface Answers {
  level?: string;
  goal?: string;
  languages: string[];
  dailyMinutes?: number;
}

const questions = [
  {
    key: "level",
    title: "Bạn đang ở trình độ nào?",
    subtitle: "Để mình chọn bài khởi đầu vừa sức với bạn.",
    options: levelOptions,
    multiple: false,
  },
  {
    key: "goal",
    title: "Bạn học lập trình để làm gì?",
    subtitle: "Mình sẽ gợi ý lộ trình phù hợp với mục tiêu này.",
    options: goalOptions,
    multiple: false,
  },
  {
    key: "languages",
    title: "Bạn muốn dùng ngôn ngữ nào?",
    subtitle: "Chọn một hoặc nhiều, đổi lại được sau.",
    options: languageOptions,
    multiple: true,
  },
  {
    key: "dailyMinutes",
    title: "Mỗi ngày bạn dành bao lâu để học?",
    subtitle: "Đặt mục tiêu nhỏ để giữ chuỗi ngày học.",
    options: dailyOptions,
    multiple: false,
  },
] as const;

function OptionCard({
  selected,
  label,
  hint,
  multiple,
  onSelect,
}: {
  selected: boolean;
  label: string;
  hint: string;
  multiple: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border bg-background p-4 text-left transition-all",
        selected
          ? "border-primary bg-secondary/30 ring-4 ring-highlight/15"
          : "border-border hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center border-2 transition-colors",
          multiple ? "rounded-md" : "rounded-full",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40",
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {hint}
        </span>
      </span>
    </button>
  );
}

export function OnboardingWizard({ firstName }: { firstName: string }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    completeStudentOnboarding,
    {},
  );
  const [role, setRole] = useState<Role | null>(null);
  const [step, setStep] = useState(0); // 0 = role, 1..4 = questions
  const [answers, setAnswers] = useState<Answers>({ languages: [] });

  const question = step > 0 ? questions[step - 1] : null;
  const totalSteps = questions.length + 1;
  const isLast = step === questions.length;

  function isAnswered(index: number) {
    const key = questions[index].key;
    if (key === "languages") return answers.languages.length > 0;
    return answers[key] !== undefined;
  }

  function select(option: Option<string | number>) {
    if (!question) return;
    if (question.key === "languages") {
      const value = String(option.value);
      setAnswers((current) => ({
        ...current,
        languages: current.languages.includes(value)
          ? current.languages.filter((item) => item !== value)
          : [...current.languages, value],
      }));
    } else {
      setAnswers((current) => ({ ...current, [question.key]: option.value }));
    }
  }

  function isSelected(option: Option<string | number>) {
    if (!question) return false;
    if (question.key === "languages")
      return answers.languages.includes(String(option.value));
    return answers[question.key] === option.value;
  }

  const canContinue = step === 0 ? role === "student" : isAnswered(step - 1);

  return (
    <form
      action={action}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !isLast) {
          event.preventDefault();
          if (canContinue) setStep(step + 1);
        }
      }}
      className="flex min-h-dvh flex-col bg-gradient-to-b from-secondary/40 via-background to-background"
    >
      {/* Answers travel as hidden inputs to the server action */}
      <input type="hidden" name="level" value={answers.level ?? ""} />
      <input type="hidden" name="goal" value={answers.goal ?? ""} />
      {answers.languages.map((language) => (
        <input key={language} type="hidden" name="languages" value={language} />
      ))}
      <input
        type="hidden"
        name="dailyMinutes"
        value={answers.dailyMinutes ?? ""}
      />

      <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-6 sm:px-6">
        <span className="flex items-center gap-2.5 text-lg font-bold text-primary">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <CodeXml className="size-5" aria-hidden />
          </span>
          Code Carf
        </span>
        <span className="ml-auto text-sm text-muted-foreground">
          Bước {step + 1}/{totalSteps}
        </span>
      </header>
      <div className="mx-auto mt-4 w-full max-w-3xl px-4 sm:px-6">
        <div
          role="progressbar"
          aria-label="Tiến độ làm quen"
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={step + 1}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
        {step === 0 ? (
          <>
            <p className="text-sm font-semibold text-primary">
              Chào {firstName}, tài khoản đã sẵn sàng!
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Bạn tham gia Code Carf với vai trò nào?
            </h1>
            <p className="mt-2 text-muted-foreground">
              Mình sẽ chuẩn bị không gian phù hợp cho bạn.
            </p>

            <div
              role="radiogroup"
              aria-label="Vai trò"
              className="mt-8 grid gap-4 sm:grid-cols-2"
            >
              {[
                {
                  value: "student" as const,
                  icon: GraduationCap,
                  title: "Học viên",
                  text: "Học theo lộ trình, làm bài được chấm ngay, tham gia thi đấu.",
                },
                {
                  value: "teacher" as const,
                  icon: Presentation,
                  title: "Giảng viên",
                  text: "Tạo lộ trình, ra đề, tổ chức cuộc thi và chấm bài.",
                },
              ].map((item) => {
                const selected = role === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setRole(item.value)}
                    className={cn(
                      "relative rounded-3xl border bg-background p-6 text-left transition-all",
                      selected
                        ? "border-primary ring-4 ring-highlight/15"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {item.value === "teacher" && (
                      <span className="absolute top-4 right-4 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent-strong">
                        Sắp ra mắt
                      </span>
                    )}
                    <span
                      className={cn(
                        "grid size-12 place-items-center rounded-2xl",
                        item.value === "student"
                          ? "bg-secondary/60 text-primary"
                          : "bg-accent/10 text-accent-strong",
                      )}
                    >
                      <item.icon className="size-6" aria-hidden />
                    </span>
                    <span className="mt-4 block text-lg font-semibold">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {item.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {role === "teacher" && (
              <div
                role="status"
                className="mt-5 rounded-2xl border border-accent/20 bg-accent/5 p-4 text-sm"
              >
                <p className="font-semibold">
                  Không gian giảng viên đang được phát triển
                </p>
                <p className="mt-1 text-muted-foreground">
                  Quyền giảng viên sẽ do quản trị viên cấp khi tính năng mở.
                  Trong lúc chờ, bạn có thể dùng Code Carf với vai trò học viên.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setRole("student")}
                  >
                    Tiếp tục với vai trò học viên
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    formAction={logoutAction}
                  >
                    Đăng xuất
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          question && (
            <>
              <p className="text-sm font-semibold text-primary">
                Câu {step}/{questions.length}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                {question.title}
              </h1>
              <p className="mt-2 text-muted-foreground">{question.subtitle}</p>
              <div
                role={question.multiple ? "group" : "radiogroup"}
                aria-label={question.title}
                className="mt-8 grid gap-3 sm:grid-cols-2"
              >
                {(question.options as Option<string | number>[]).map(
                  (option) => (
                    <OptionCard
                      key={String(option.value)}
                      label={option.label}
                      hint={option.hint}
                      multiple={question.multiple}
                      selected={isSelected(option)}
                      onSelect={() => select(option)}
                    />
                  ),
                )}
              </div>
            </>
          )
        )}

        {state.error && (
          <p
            role="alert"
            className="mt-6 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {state.error}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-10">
          {step > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Quay lại
            </Button>
          ) : (
            <span />
          )}
          {isLast ? (
            <Button
              type="submit"
              size="lg"
              disabled={!canContinue || pending}
              className="rounded-xl px-6 shadow-lg shadow-primary/25"
            >
              {pending ? "Đang chuẩn bị..." : "Bắt đầu học"}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              disabled={!canContinue}
              onClick={() => setStep(step + 1)}
              className="rounded-xl px-6"
            >
              Tiếp tục
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </main>
    </form>
  );
}
