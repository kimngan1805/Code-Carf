"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleCheck,
  Code,
  ListChecks,
  LoaderCircle,
  PenLine,
  Plus,
  Save,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RoomMarkdown } from "@/features/rooms/components/room-markdown";
import {
  exerciseFieldsSchema,
  MAX_QUIZ_OPTIONS,
  MAX_QUIZ_QUESTIONS,
  MAX_TEST_CASES,
  type ExerciseKindKey,
} from "../authoring-schema";
import { saveExerciseAction } from "../authoring-actions";

type TestRow = {
  key: string;
  input: string;
  expected: string;
  isHidden: boolean;
  weight: string;
};
type QuestionRow = {
  key: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};
type Initial = {
  id: string;
  kind: ExerciseKindKey;
  rubric: string | null;
  quizQuestions: {
    prompt: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
  title: string;
  prompt: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  points: number;
  timeLimitMs: number;
  memoryLimitKb: number;
  testCases: {
    input: string;
    expected: string;
    isHidden: boolean;
    weight: number;
  }[];
};

const KINDS: {
  value: ExerciseKindKey;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    value: "CODE",
    label: "Bài tập code",
    hint: "Học viên viết code, chấm tự động theo test case.",
    icon: Code,
  },
  {
    value: "QUIZ",
    label: "Trắc nghiệm",
    hint: "Chọn một đáp án đúng cho mỗi câu, chấm ngay khi nộp.",
    icon: ListChecks,
  },
  {
    value: "HANDWRITTEN",
    label: "Tự luận",
    hint: "Học viên nộp ảnh bài làm, chấm theo đáp án mẫu.",
    icon: PenLine,
  },
];

const PROMPT_PLACEHOLDERS: Record<ExerciseKindKey, string> = {
  CODE: "Cho số nguyên dương n. In ra tổng 1 + 2 + ... + n.\n\n**Input:** một dòng chứa n.\n**Output:** một số nguyên.",
  QUIZ: "Trả lời các câu hỏi dưới đây về biến và kiểu dữ liệu.",
  HANDWRITTEN:
    "Trình bày sự khác nhau giữa vòng lặp for và while. Cho ví dụ minh họa.",
};

function newQuestion(key: string): QuestionRow {
  return { key, prompt: "", options: ["", ""], answer: 0, explanation: "" };
}

const difficulties = [
  { value: "EASY", label: "Dễ" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HARD", label: "Khó" },
] as const;
const inputClass =
  "h-11 w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-2";

function newRow(key: string, partial: Partial<TestRow> = {}): TestRow {
  return {
    key,
    input: "",
    expected: "",
    isHidden: false,
    weight: "1",
    ...partial,
  };
}

export function ExerciseEditor({
  pathSlug,
  roomId,
  exercise,
}: {
  pathSlug: string;
  roomId: string;
  exercise?: Initial;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(exercise?.title ?? "");
  const [prompt, setPrompt] = useState(exercise?.prompt ?? "");
  const [difficulty, setDifficulty] = useState(exercise?.difficulty ?? "EASY");
  const [points, setPoints] = useState(String(exercise?.points ?? 100));
  const [timeLimitMs, setTimeLimitMs] = useState(
    String(exercise?.timeLimitMs ?? 1000),
  );
  const [memoryMb, setMemoryMb] = useState(
    String(Math.round((exercise?.memoryLimitKb ?? 262144) / 1024)),
  );
  const [tests, setTests] = useState<TestRow[]>(() =>
    exercise?.testCases.length
      ? exercise.testCases.map((test, index) =>
          newRow(`row-${index}`, { ...test, weight: String(test.weight) }),
        )
      : [newRow("row-0")],
  );
  const [kind, setKind] = useState<ExerciseKindKey>(exercise?.kind ?? "CODE");
  const [rubric, setRubric] = useState(exercise?.rubric ?? "");
  const [questions, setQuestions] = useState<QuestionRow[]>(() =>
    exercise?.quizQuestions.length
      ? exercise.quizQuestions.map((question, index) => ({
          key: `q-${index}`,
          ...question,
        }))
      : [newQuestion("q-0")],
  );
  const nextQuestion = useRef(questions.length);
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  // Stable, server-safe keys: random ids would differ between SSR and hydration.
  const nextKey = useRef(tests.length);
  const inFlight = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const back = `/gv/paths/${pathSlug}/rooms/${roomId}`;

  function addTest() {
    const key = `row-${nextKey.current++}`;
    setTests((rows) => [...rows, newRow(key)]);
  }

  function changeTest(key: string, patch: Partial<TestRow>) {
    setTests((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function changeQuestion(key: string, patch: Partial<QuestionRow>) {
    setQuestions((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function payload() {
    const base = {
      kind,
      title,
      prompt,
      difficulty,
      points: points.trim() === "" ? NaN : Number(points),
    };
    if (kind === "HANDWRITTEN") return { ...base, rubric };
    if (kind === "QUIZ")
      return {
        ...base,
        questions: questions.map((question) => ({
          prompt: question.prompt,
          options: question.options,
          answer: question.answer,
          explanation: question.explanation,
        })),
      };
    return {
      ...base,
      timeLimitMs: timeLimitMs.trim() === "" ? NaN : Number(timeLimitMs),
      memoryMb: memoryMb.trim() === "" ? NaN : Number(memoryMb),
      testCases: tests.map((test) => ({
        input: test.input,
        expected: test.expected,
        isHidden: test.isHidden,
        weight: test.weight.trim() === "" ? NaN : Number(test.weight),
      })),
    };
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    const parsed = exerciseFieldsSchema.safeParse(payload());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const index = typeof issue.path[1] === "number" ? issue.path[1] + 1 : 0;
      const where =
        index && issue.path[0] === "testCases"
          ? `Test ${index}: `
          : index && issue.path[0] === "questions"
            ? `Câu ${index}: `
            : "";
      setError(`${where}${issue.message}`);
      return;
    }
    inFlight.current = true;
    setPending(true);
    let navigating = false;
    try {
      const fingerprint = JSON.stringify(parsed.data);
      if (request.current?.fingerprint !== fingerprint)
        request.current = { fingerprint, id: crypto.randomUUID() };
      const result = await saveExerciseAction({
        ...parsed.data,
        pathSlug,
        roomId,
        ...(exercise
          ? { exerciseId: exercise.id }
          : { requestId: request.current.id }),
      });
      if (result.error || !result.data) {
        setError(result.error ?? "Chưa thể lưu bài tập.");
        return;
      }
      router.push(`${back}?exercise=saved`);
      router.refresh();
      navigating = true;
    } catch {
      setError("Mất kết nối. Nội dung vẫn được giữ lại, bạn có thể lưu lại.");
    } finally {
      if (!navigating) {
        inFlight.current = false;
        setPending(false);
      }
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-busy={pending}
      className="space-y-6 rounded-2xl border bg-background p-4 sm:p-6"
    >
      <fieldset disabled={pending} className="space-y-6">
        <fieldset className="space-y-2.5">
          <legend className="text-sm font-semibold">
            Loại bài tập <span className="text-destructive">*</span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {KINDS.map((item) => {
              const selected = kind === item.value;
              return (
                <label
                  key={item.value}
                  className={cn(
                    "flex cursor-pointer flex-col gap-2 rounded-2xl border-2 p-4 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                    selected
                      ? "border-primary bg-secondary/30 shadow-[3px_3px_0_0_var(--brand-blue)]"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <input
                    type="radio"
                    name="exercise-kind"
                    value={item.value}
                    checked={selected}
                    onChange={() => setKind(item.value)}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between">
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-9 place-items-center rounded-xl",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <item.icon className="size-4" />
                    </span>
                    {selected && (
                      <Check
                        aria-hidden
                        className="size-4 text-primary"
                        strokeWidth={3}
                      />
                    )}
                  </span>
                  <span className="text-sm font-bold">{item.label}</span>
                  <span className="text-xs leading-5 text-muted-foreground">
                    {item.hint}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="exercise-title" className="text-sm font-semibold">
            Tên bài tập <span className="text-destructive">*</span>
          </label>
          <input
            id="exercise-title"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Tổng từ 1 đến n"
            className={inputClass}
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="exercise-prompt" className="text-sm font-semibold">
              Đề bài <span className="text-destructive">*</span>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={preview}
              onClick={() => setPreview(!preview)}
            >
              {preview ? "Tiếp tục soạn" : "Xem trước"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Hỗ trợ Markdown. Nên ghi rõ định dạng đầu vào, đầu ra và ví dụ.
          </p>
          {preview ? (
            <section
              aria-label="Xem trước đề bài"
              className="min-h-56 rounded-xl border bg-muted/20 p-4"
            >
              {prompt.trim() ? (
                <RoomMarkdown content={prompt} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa có nội dung để xem trước.
                </p>
              )}
            </section>
          ) : (
            <textarea
              id="exercise-prompt"
              rows={10}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={PROMPT_PLACEHOLDERS[kind]}
              className="block w-full resize-y rounded-xl border bg-background p-4 font-mono text-sm leading-6 focus-visible:outline-2"
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="exercise-difficulty"
              className="text-sm font-semibold"
            >
              Độ khó <span className="text-destructive">*</span>
            </label>
            <select
              id="exercise-difficulty"
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as typeof difficulty)
              }
              className={inputClass}
            >
              {difficulties.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="exercise-points" className="text-sm font-semibold">
              Điểm (XP) <span className="text-destructive">*</span>
            </label>
            <input
              id="exercise-points"
              inputMode="numeric"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className={inputClass}
            />
          </div>
          {kind === "CODE" && (
            <>
              <div className="space-y-2">
                <label
                  htmlFor="exercise-time"
                  className="text-sm font-semibold"
                >
                  Giới hạn thời gian (ms)
                </label>
                <input
                  id="exercise-time"
                  inputMode="numeric"
                  value={timeLimitMs}
                  onChange={(e) => setTimeLimitMs(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="exercise-memory"
                  className="text-sm font-semibold"
                >
                  Giới hạn bộ nhớ (MB)
                </label>
                <input
                  id="exercise-memory"
                  inputMode="numeric"
                  value={memoryMb}
                  onChange={(e) => setMemoryMb(e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}
        </div>

        {kind === "HANDWRITTEN" && (
          <div className="space-y-2">
            <label htmlFor="exercise-rubric" className="text-sm font-semibold">
              Đáp án mẫu và tiêu chí chấm{" "}
              <span className="text-destructive">*</span>
            </label>
            <p className="text-xs text-muted-foreground">
              AI dùng phần này để gợi ý điểm, giảng viên duyệt lại trước khi trả
              kết quả. Học viên không thấy nội dung này.
            </p>
            <textarea
              id="exercise-rubric"
              rows={8}
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              placeholder={
                "- Nêu đúng điều kiện dừng của while (3 điểm)\n- Ví dụ chạy đúng (4 điểm)\n- Trình bày rõ ràng (3 điểm)"
              }
              className="block w-full resize-y rounded-xl border bg-background p-4 text-sm leading-6 focus-visible:outline-2"
            />
          </div>
        )}

        {kind === "QUIZ" && (
          <section className="space-y-3" aria-label="Câu hỏi trắc nghiệm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">
                  Câu hỏi <span className="text-destructive">*</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Bấm vào vòng tròn để đánh dấu đáp án đúng. Học viên đạt khi
                  đúng từ 70% số câu.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={questions.length >= MAX_QUIZ_QUESTIONS}
                onClick={() =>
                  setQuestions((rows) => [
                    ...rows,
                    newQuestion(`q-${nextQuestion.current++}`),
                  ])
                }
              >
                <Plus className="size-4" aria-hidden />
                Thêm câu hỏi
              </Button>
            </div>
            <ol className="space-y-3">
              {questions.map((question, index) => (
                <li
                  key={question.key}
                  className="space-y-3 rounded-2xl border-2 border-primary/15 p-4 focus-within:border-primary"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-sky-light/70 text-xs font-bold text-primary"
                    >
                      {index + 1}
                    </span>
                    <label className="sr-only" htmlFor={`${question.key}-p`}>
                      Nội dung câu {index + 1}
                    </label>
                    <textarea
                      id={`${question.key}-p`}
                      rows={2}
                      value={question.prompt}
                      onChange={(e) =>
                        changeQuestion(question.key, { prompt: e.target.value })
                      }
                      placeholder={`Câu ${index + 1}: nội dung câu hỏi`}
                      className="block w-full resize-y rounded-lg border bg-background p-2.5 text-sm font-semibold"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={questions.length === 1}
                      aria-label={`Xóa câu ${index + 1}`}
                      onClick={() =>
                        setQuestions((rows) =>
                          rows.filter((row) => row.key !== question.key),
                        )
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                  <fieldset className="space-y-2 pl-11">
                    <legend className="sr-only">
                      Đáp án của câu {index + 1}
                    </legend>
                    {question.options.map((option, optionIndex) => {
                      const correct = question.answer === optionIndex;
                      const letter = String.fromCharCode(65 + optionIndex);
                      return (
                        <div
                          key={optionIndex}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-1.5 pl-2",
                            correct && "border-success bg-success/5",
                          )}
                        >
                          <label className="flex cursor-pointer items-center">
                            <input
                              type="radio"
                              name={`${question.key}-answer`}
                              checked={correct}
                              onChange={() =>
                                changeQuestion(question.key, {
                                  answer: optionIndex,
                                })
                              }
                              className="sr-only"
                            />
                            <span
                              className={cn(
                                "grid size-6 place-items-center rounded-full border-2 text-[11px] font-bold",
                                correct
                                  ? "border-success bg-success text-success-foreground"
                                  : "border-border text-muted-foreground",
                              )}
                            >
                              {correct ? (
                                <CircleCheck aria-hidden className="size-4" />
                              ) : (
                                letter
                              )}
                            </span>
                            <span className="sr-only">
                              Đánh dấu đáp án {letter} là đúng
                            </span>
                          </label>
                          <input
                            aria-label={`Đáp án ${letter} của câu ${index + 1}`}
                            value={option}
                            onChange={(e) =>
                              changeQuestion(question.key, {
                                options: question.options.map((value, i) =>
                                  i === optionIndex ? e.target.value : value,
                                ),
                              })
                            }
                            placeholder={`Đáp án ${letter}`}
                            className="h-9 min-w-0 flex-1 rounded-md bg-transparent px-2 text-sm focus-visible:outline-2"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={question.options.length <= 2}
                            aria-label={`Xóa đáp án ${letter} của câu ${index + 1}`}
                            onClick={() =>
                              changeQuestion(question.key, {
                                options: question.options.filter(
                                  (_, i) => i !== optionIndex,
                                ),
                                answer:
                                  question.answer === optionIndex
                                    ? 0
                                    : question.answer > optionIndex
                                      ? question.answer - 1
                                      : question.answer,
                              })
                            }
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={question.options.length >= MAX_QUIZ_OPTIONS}
                        onClick={() =>
                          changeQuestion(question.key, {
                            options: [...question.options, ""],
                          })
                        }
                        className="text-primary"
                      >
                        <Plus className="size-3.5" aria-hidden />
                        Thêm đáp án
                      </Button>
                    </div>
                    <label className="sr-only" htmlFor={`${question.key}-e`}>
                      Giải thích câu {index + 1}
                    </label>
                    <input
                      id={`${question.key}-e`}
                      value={question.explanation}
                      onChange={(e) =>
                        changeQuestion(question.key, {
                          explanation: e.target.value,
                        })
                      }
                      placeholder="Giải thích (hiện sau khi học viên nộp bài, không bắt buộc)"
                      className="h-9 w-full rounded-lg border border-dashed bg-background px-2.5 text-xs"
                    />
                  </fieldset>
                </li>
              ))}
            </ol>
          </section>
        )}

        {kind === "CODE" && (
          <section className="space-y-3" aria-label="Test case">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">
                  Test case <span className="text-destructive">*</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Test hiện: học viên thấy đầu vào và đáp án. Test ẩn: chỉ thấy
                  đạt hay không.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={tests.length >= MAX_TEST_CASES}
                onClick={addTest}
              >
                <Plus className="size-4" aria-hidden />
                Thêm test
              </Button>
            </div>
            <ol className="space-y-3">
              {tests.map((test, index) => (
                <li key={test.key} className="space-y-3 rounded-xl border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Test {index + 1}</p>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={test.isHidden}
                          onChange={(e) =>
                            changeTest(test.key, { isHidden: e.target.checked })
                          }
                          className="size-4 accent-primary"
                        />
                        Ẩn
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        Điểm
                        <input
                          inputMode="numeric"
                          aria-label={`Điểm của test ${index + 1}`}
                          value={test.weight}
                          onChange={(e) =>
                            changeTest(test.key, { weight: e.target.value })
                          }
                          className="h-9 w-16 rounded-lg border bg-background px-2 text-sm"
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={tests.length === 1}
                        aria-label={`Xóa test ${index + 1}`}
                        onClick={() =>
                          setTests((rows) =>
                            rows.filter((row) => row.key !== test.key),
                          )
                        }
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label
                        htmlFor={`input-${test.key}`}
                        className="text-xs font-semibold text-muted-foreground"
                      >
                        Đầu vào
                      </label>
                      <textarea
                        id={`input-${test.key}`}
                        rows={3}
                        value={test.input}
                        onChange={(e) =>
                          changeTest(test.key, { input: e.target.value })
                        }
                        className="block w-full resize-y rounded-lg border bg-background p-2 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor={`expected-${test.key}`}
                        className="text-xs font-semibold text-muted-foreground"
                      >
                        Đáp án đúng
                      </label>
                      <textarea
                        id={`expected-${test.key}`}
                        rows={3}
                        value={test.expected}
                        onChange={(e) =>
                          changeTest(test.key, { expected: e.target.value })
                        }
                        className="block w-full resize-y rounded-lg border bg-background p-2 font-mono text-sm"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(back)}
          >
            Hủy
          </Button>
          <Button type="submit">
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {pending
              ? "Đang lưu..."
              : exercise
                ? "Lưu thay đổi"
                : "Thêm bài tập"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
