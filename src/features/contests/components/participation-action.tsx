"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContestPhase } from "../time";

export function ParticipationAction({
  slug,
  phase,
  registered,
  finished,
  canParticipate,
  needsFaceCheck,
}: {
  slug: string;
  phase: ContestPhase;
  registered: boolean;
  finished: boolean;
  canParticipate: boolean;
  needsFaceCheck: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
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
  if (!canParticipate)
    return (
      <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        Chỉ tài khoản học viên được đăng ký và vào thi.
      </p>
    );
  if (finished || phase === "ended")
    return (
      <Button disabled className="w-full">
        {finished ? "Bạn đã kết thúc lượt thi" : "Cuộc thi đã kết thúc"}
      </Button>
    );
  if (phase === "unscheduled")
    return (
      <Button disabled className="w-full">
        Chưa mở đăng ký
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
          {phase === "live" ? (
            needsFaceCheck ? (
              <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
                Bạn cần hoàn tất xác minh khuôn mặt để vào cuộc thi này.
              </p>
            ) : (
              <Button asChild className="w-full">
                <Link href={`/contests/${slug}/play`}>
                  <LogIn className="size-4" aria-hidden />
                  Vào thi ngay
                </Link>
              </Button>
            )
          ) : (
            <Button disabled className="w-full">
              Chờ đến giờ bắt đầu
            </Button>
          )}
        </>
      ) : (
        <Button onClick={register} disabled={pending} className="w-full">
          {pending ? "Đang đăng ký..." : "Đăng ký tham gia"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
