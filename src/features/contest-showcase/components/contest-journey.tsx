"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Crown, Flag, Lock, Play } from "lucide-react";
import { requestContestEntry } from "@/features/contests/entry-request";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QUESTION_TYPES, type ContestJourney } from "../catalog";
import { LANDMARKS, Scenery } from "./journey-art";

/**
 * Toạ độ các chặng trong khung 1000 x 700. Đường đi kiểu rắn bò: dọc bờ dưới sang phải,
 * lên sườn phải, quay sang trái qua giữa đảo, rồi lên đỉnh núi lửa, nên luôn thấy rõ "tiến lên".
 */
const SLOTS: [number, number][] = [
  [215, 548],
  [350, 585],
  [490, 572],
  [640, 548],
  [742, 432],
  [565, 405],
  [385, 335],
  [560, 222],
];

/** Đường cong mượt đi qua các chặng (Catmull-Rom chuyển sang Bézier). */
function trail(points: [number, number][]) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

type StageState = "done" | "current" | "locked";

const pct = (x: number, y: number) => ({
  left: `${x / 10}%`,
  top: `${(y / 700) * 100}%`,
});

export function ContestJourneyMap({
  journey,
  startHref,
}: {
  journey: ContestJourney;
  /**
   * Đường vào thi; bỏ trống với cuộc thi mẫu chưa có đề thật. Bắt đầu bằng "#" (khu vực thí
   * sinh) thì mở hộp thoại vào thi của khung thao tác, không được thì cuộn tới khung đó.
   */
  startHref?: string;
}) {
  const [selected, setSelected] = useState(journey.currentStage);
  const stages = journey.stages.slice(0, SLOTS.length);
  const points = SLOTS.slice(0, stages.length);
  const stateOf = (index: number): StageState =>
    index < journey.currentStage
      ? "done"
      : index === journey.currentStage
        ? "current"
        : "locked";
  const earned = stages
    .slice(0, journey.currentStage)
    .filter((stage) => stage.title)
    .map((stage) => stage.title as string);
  const currentTitle = earned.at(-1) ?? "Chưa có danh hiệu";
  const stage = stages[selected];
  const state = stateOf(selected);
  const route = trail(points);
  const walked = trail(points.slice(0, journey.currentStage + 1));
  const locked = points.slice(journey.currentStage + 1);

  return (
    <section
      aria-labelledby="journey-title"
      className="overflow-hidden rounded-[2rem] border-2 border-primary bg-background shadow-[6px_6px_0_0_var(--brand-blue)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-primary px-6 py-4">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-accent-strong uppercase">
            Bản đồ chinh phục
          </p>
          <h2 id="journey-title" className="text-xl font-bold">
            {journey.island}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="min-w-40">
            <p className="flex justify-between text-xs font-semibold">
              <span>
                Chặng {journey.currentStage + 1}/{stages.length}
              </span>
              <span className="text-muted-foreground">
                {Math.round((journey.currentStage / stages.length) * 100)}%
              </span>
            </p>
            <span className="mt-1.5 block h-2.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-success"
                style={{
                  width: `${(journey.currentStage / stages.length) * 100}%`,
                }}
              />
            </span>
          </div>
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-orange/15 px-3 py-1.5 font-semibold text-accent-strong">
            <Crown aria-hidden className="size-4" />
            {currentTitle}
          </p>
        </div>
      </div>

      {/* Bản đồ vẽ bằng SVG; nút chặng và nhãn là HTML để bấm và đọc được. */}
      <div className="@container relative aspect-[10/7] w-full select-none">
        <svg
          viewBox="0 0 1000 700"
          className="absolute inset-0 size-full"
          aria-hidden
        >
          <Scenery />
          {stages.map((item, index) => {
            const Landmark = LANDMARKS[index];
            return Landmark ? <Landmark key={item.name} /> : null;
          })}

          {/* Lối mòn: nền đất, nét đứt trắng, phần đã đi tô xanh. */}
          <path
            d={route}
            fill="none"
            stroke="var(--map-trail)"
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d={route}
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeDasharray="2 14"
            strokeLinecap="round"
          />
          {journey.currentStage > 0 && (
            <path
              d={walked}
              fill="none"
              stroke="var(--success)"
              strokeWidth="6"
              strokeDasharray="2 14"
              strokeLinecap="round"
            />
          )}

          {/* Sương mù phủ các chặng chưa mở; lộ dần khi tiến lên. */}
          <g filter="url(#journey-fog)" opacity="0.82">
            {locked.map(([x, y], index) => (
              <g key={index} fill="white">
                <circle cx={x - 40} cy={y + 8} r="52" />
                <circle cx={x + 30} cy={y - 10} r="62" />
                <circle cx={x + 5} cy={y + 30} r="48" />
              </g>
            ))}
          </g>
        </svg>

        <ol aria-label="Các chặng">
          {stages.map((item, index) => {
            const [x, y] = points[index];
            const itemState = stateOf(index);
            return (
              <li
                key={item.name}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={pct(x, y)}
              >
                {itemState === "current" && (
                  <span
                    aria-hidden
                    className="absolute bottom-full mb-2 hidden animate-bounce rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold whitespace-nowrap text-accent-foreground shadow-md @lg:block @2xl:text-xs"
                  >
                    VÀO THI
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelected(index)}
                  aria-pressed={selected === index}
                  aria-label={`Chặng ${index + 1}: ${item.name} (${
                    itemState === "done"
                      ? "đã vượt qua"
                      : itemState === "current"
                        ? "đang mở"
                        : "chưa mở"
                  })`}
                  className={cn(
                    "relative grid place-items-center rounded-full border-[3px] font-black shadow-[0_4px_0_0_rgb(0_0_0/0.2)] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    itemState === "current"
                      ? "size-8 border-background bg-primary text-sm text-primary-foreground ring-4 ring-primary/30 @lg:size-10 @lg:text-base @2xl:size-14 @2xl:text-xl"
                      : "size-6 border-2 text-[11px] @lg:size-8 @lg:border-[3px] @lg:text-sm @2xl:size-11 @2xl:text-base",
                    itemState === "done" &&
                      "border-background bg-success text-primary-foreground",
                    itemState === "locked" &&
                      "border-background bg-muted text-muted-foreground",
                    selected === index && "scale-110 ring-4 ring-brand-orange",
                  )}
                >
                  {itemState === "done" ? (
                    <Check
                      aria-hidden
                      className="size-3 @lg:size-4 @2xl:size-5"
                      strokeWidth={3.5}
                    />
                  ) : (
                    index + 1
                  )}
                  {itemState === "locked" && (
                    <span
                      aria-hidden
                      className="absolute -right-1 -bottom-1 hidden size-4 place-items-center rounded-full bg-muted-foreground text-primary-foreground @lg:grid @2xl:size-5"
                    >
                      <Lock className="size-2.5 @2xl:size-3" />
                    </span>
                  )}
                  {item.title && (
                    <span
                      aria-hidden
                      className="absolute -top-1.5 -right-1.5 hidden size-4 place-items-center rounded-full border-2 border-background bg-brand-orange text-primary-foreground @lg:grid @2xl:size-5"
                    >
                      <Crown className="size-2.5 @2xl:size-3" />
                    </span>
                  )}
                </button>
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap shadow-sm @2xl:text-xs",
                    itemState === "current"
                      ? "bg-primary text-primary-foreground"
                      : "hidden bg-background/95 text-foreground @2xl:inline",
                    itemState === "locked" && "text-muted-foreground",
                  )}
                >
                  {item.name}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {stage && (
        <div className="grid gap-6 border-t-2 border-primary p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex gap-4">
            <span
              aria-hidden
              className={cn(
                "grid size-14 shrink-0 place-items-center rounded-2xl border-2 text-2xl font-black",
                state === "done" && "border-success bg-success/10 text-success",
                state === "current" &&
                  "border-primary bg-brand-sky-light/60 text-primary",
                state === "locked" &&
                  "border-border bg-muted text-muted-foreground",
              )}
            >
              {selected + 1}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">
                Chặng {selected + 1} · {QUESTION_TYPES[stage.questionType]} ·{" "}
                {stage.count} {stage.questionType === "coding" ? "bài" : "câu"}
              </p>
              <h3 className="text-lg font-bold">{stage.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {stage.description}
              </p>
              {stage.title && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-orange/15 px-2.5 py-1 text-xs font-semibold text-accent-strong">
                  <Crown aria-hidden className="size-3.5" />
                  Qua chặng nhận danh hiệu “{stage.title}”
                </p>
              )}
            </div>
          </div>
          <div className="md:w-48">
            {state === "current" ? (
              startHref?.startsWith("#") ? (
                <Button
                  className="w-full rounded-full"
                  onClick={() => {
                    if (!requestContestEntry())
                      document.querySelector(startHref)?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                  }}
                >
                  <Play aria-hidden className="size-4 fill-current" /> Vào thi
                  chặng này
                </Button>
              ) : startHref ? (
                <Button asChild className="w-full rounded-full">
                  <Link href={startHref}>
                    <Play aria-hidden className="size-4 fill-current" /> Vào thi
                    chặng này
                  </Link>
                </Button>
              ) : (
                <Button className="w-full rounded-full" disabled>
                  <Play aria-hidden className="size-4 fill-current" /> Chưa mở
                  đề thi
                </Button>
              )
            ) : state === "done" ? (
              <p className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-success px-4 py-2 text-sm font-semibold text-success">
                <Check aria-hidden className="size-4" /> Đã vượt qua
              </p>
            ) : (
              <p className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-muted px-4 py-2 text-center text-sm font-semibold text-muted-foreground">
                <Lock aria-hidden className="size-4" /> Qua chặng {selected} để
                mở
              </p>
            )}
          </div>
        </div>
      )}

      <div className="border-t-2 border-primary bg-brand-sky-light/30 px-6 py-4">
        <p className="mb-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          Thang danh hiệu
        </p>
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {stages
            .map((item, index) => ({ ...item, index }))
            .filter((item) => item.title)
            .map((item, order, list) => {
              const got = item.index < journey.currentStage;
              return (
                <li key={item.title} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-semibold",
                      got
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-primary/20 bg-background text-muted-foreground",
                    )}
                  >
                    {got ? (
                      <Crown aria-hidden className="size-3.5" />
                    ) : (
                      <Flag aria-hidden className="size-3.5" />
                    )}
                    {item.title}
                  </span>
                  {order < list.length - 1 && (
                    <span aria-hidden className="text-muted-foreground">
                      →
                    </span>
                  )}
                </li>
              );
            })}
        </ol>
      </div>
    </section>
  );
}
