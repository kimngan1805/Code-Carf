"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContestPhase } from "../time";
import { ContestEntryDialog } from "./contest-entry-dialog";
import {
  enterExamFullscreen,
  exitExamFullscreen,
  prepareExamEntry,
} from "../fullscreen";
import { CONTEST_ENTRY_REQUEST } from "../entry-request";

export function ParticipationAction({
  slug,
  phase,
  examPhase,
  registered,
  finished,
  canParticipate,
  needsFaceCheck,
  attemptStarted,
  attemptExpired,
  durationMinutes,
}: {
  slug: string;
  phase: ContestPhase;
  examPhase: ContestPhase;
  registered: boolean;
  finished: boolean;
  canParticipate: boolean;
  needsFaceCheck: boolean;
  attemptStarted: boolean;
  attemptExpired: boolean;
  durationMinutes: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [entryOpen, setEntryOpen] = useState(false);
  const entering = useRef(false);
  const canEnter =
    canParticipate &&
    registered &&
    !finished &&
    !attemptExpired &&
    examPhase === "live" &&
    !needsFaceCheck;
  // Nút "Vào thi chặng này" trên bản đồ mở cùng hộp thoại toàn màn hình như nút ở đây.
  useEffect(() => {
    if (!canEnter) return;
    const open = (event: Event) => {
      event.preventDefault();
      setError("");
      setEntryOpen(true);
    };
    window.addEventListener(CONTEST_ENTRY_REQUEST, open);
    return () => window.removeEventListener(CONTEST_ENTRY_REQUEST, open);
  }, [canEnter]);
  async function register() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/contests/${encodeURIComponent(slug)}/registration`,
        { method: "POST" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "Không thể đăng ký cuộc thi.");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Mất kết nối. Vui lòng thử lại.",
      );
    } finally {
      setPending(false);
    }
  }
  async function startAttempt() {
    if (entering.current) return;
    entering.current = true;
    setPending(true);
    setError("");
    let enteredFullscreen = false;
    try {
      await prepareExamEntry(attemptStarted, {
        fullscreen: async () => {
          const wasFullscreen = !!document.fullscreenElement;
          await enterExamFullscreen();
          enteredFullscreen = !wasFullscreen;
        },
        start: async () => {
          const response = await fetch(
            `/api/contests/${encodeURIComponent(slug)}/start`,
            { method: "POST" },
          );
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.error?.message ?? "Chưa thể bắt đầu làm bài.",
            );
        },
        navigate: () => {
          setEntryOpen(false);
          router.push(`/contests/${encodeURIComponent(slug)}/play`);
        },
      });
    } catch (failure) {
      if (enteredFullscreen) await exitExamFullscreen();
      setError(
        failure instanceof Error
          ? failure.message
          : "Mất kết nối. Vui lòng thử lại.",
      );
    } finally {
      entering.current = false;
      setPending(false);
    }
  }
  if (!canParticipate)
    return (
      <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        Chỉ tài khoản học viên được đăng ký và vào thi.
      </p>
    );
  if (finished || attemptExpired)
    return (
      <Button asChild className="w-full">
        <Link href={`/contests/${slug}/play`}>Xem kết quả lượt làm bài</Link>
      </Button>
    );
  if (!registered && phase !== "live")
    return (
      <Button disabled className="w-full">
        {phase === "ended" ? "Đã đóng đăng ký" : "Chưa mở đăng ký"}
      </Button>
    );
  return (
    <div className="space-y-3">
      {registered ? (
        <>
          <p
            role="status"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-success"
          >
            <CheckCircle2 className="size-4" aria-hidden />
            Bạn đã đăng ký
          </p>
          {examPhase !== "live" ? (
            <Button disabled className="w-full">
              {examPhase === "upcoming"
                ? "Chờ đến giờ thi"
                : examPhase === "ended"
                  ? "Đã đóng làm bài"
                  : "Chưa có lịch thi"}
            </Button>
          ) : needsFaceCheck ? (
            <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
              Bạn cần hoàn tất xác minh khuôn mặt để vào cuộc thi này.
            </p>
          ) : attemptStarted ? (
            <Button
              onClick={() => {
                setError("");
                setEntryOpen(true);
              }}
              className="w-full"
            >
              <LogIn className="size-4" aria-hidden />
              Tiếp tục làm bài
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  setError("");
                  setEntryOpen(true);
                }}
                disabled={pending}
                className="w-full"
              >
                {pending ? "Đang bắt đầu..." : "Bắt đầu làm bài"}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                Bạn có tối đa {durationMinutes} phút từ khi bắt đầu và phải kết
                thúc trước giờ đóng làm bài chung. Tải lại trang không đặt lại
                thời gian.
              </p>
            </>
          )}
        </>
      ) : (
        <Button onClick={register} disabled={pending} className="w-full">
          {pending ? "Đang đăng ký..." : "Đăng ký tham gia"}
        </Button>
      )}
      <ContestEntryDialog
        open={entryOpen}
        started={attemptStarted}
        pending={pending}
        error={error}
        onEnter={() => void startAttempt()}
        onCancel={() => setEntryOpen(false)}
      />
      {error && !entryOpen && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
