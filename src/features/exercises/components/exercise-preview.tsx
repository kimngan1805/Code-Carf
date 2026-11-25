import { Check, EyeOff } from "lucide-react";
import { RoomMarkdown } from "@/features/rooms/components/room-markdown";
import { cn } from "@/lib/utils";

type PreviewExercise = {
  kind: "CODE" | "HANDWRITTEN" | "QUIZ";
  prompt: string;
  rubric: string | null;
  testCases: { input: string; expected: string; isHidden: boolean }[];
  quizQuestions: {
    prompt: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
};

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
      {children}
    </h4>
  );
}

/** Xem nhanh bài tập như giảng viên cần kiểm tra: đề bài và phần chấm (đáp án, test, tiêu chí). */
export function ExercisePreview({ exercise }: { exercise: PreviewExercise }) {
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <Heading>Đề bài</Heading>
        <RoomMarkdown content={exercise.prompt} />
      </section>

      {exercise.kind === "QUIZ" && (
        <section className="space-y-3">
          <Heading>Câu hỏi và đáp án</Heading>
          <ol className="space-y-3">
            {exercise.quizQuestions.map((question, index) => (
              <li key={index} className="rounded-xl bg-muted/30 p-3 text-sm">
                <p className="font-semibold whitespace-pre-line">
                  {index + 1}. {question.prompt}
                </p>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => {
                    const correct = optionIndex === question.answer;
                    return (
                      <li
                        key={optionIndex}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
                          correct
                            ? "border-success bg-success/10 font-semibold text-success"
                            : "border-border bg-background",
                        )}
                      >
                        <span className="text-xs font-bold">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>
                        <span className="min-w-0 break-words">{option}</span>
                        {correct && (
                          <>
                            <Check aria-hidden className="ml-auto size-4" />
                            <span className="sr-only">(đáp án đúng)</span>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {question.explanation && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Giải thích: {question.explanation}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {exercise.kind === "CODE" && (
        <section className="space-y-2">
          <Heading>Test case</Heading>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th scope="col" className="w-10 p-2">
                    #
                  </th>
                  <th scope="col" className="p-2">
                    Đầu vào
                  </th>
                  <th scope="col" className="p-2">
                    Đáp án
                  </th>
                  <th scope="col" className="w-20 p-2">
                    Hiển thị
                  </th>
                </tr>
              </thead>
              <tbody>
                {exercise.testCases.map((test, index) => (
                  <tr key={index} className="border-t align-top">
                    <td className="p-2 text-muted-foreground">{index + 1}</td>
                    <td className="p-2">
                      <pre className="font-mono whitespace-pre-wrap">
                        {test.input || "(trống)"}
                      </pre>
                    </td>
                    <td className="p-2">
                      <pre className="font-mono whitespace-pre-wrap">
                        {test.expected}
                      </pre>
                    </td>
                    <td className="p-2">
                      {test.isHidden ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <EyeOff aria-hidden className="size-3.5" />
                          Ẩn
                        </span>
                      ) : (
                        "Hiện"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {exercise.kind === "HANDWRITTEN" && exercise.rubric && (
        <section className="space-y-2">
          <Heading>Đáp án mẫu và tiêu chí chấm</Heading>
          <p className="rounded-xl bg-muted/30 p-3 text-sm whitespace-pre-line">
            {exercise.rubric}
          </p>
        </section>
      )}
    </div>
  );
}
