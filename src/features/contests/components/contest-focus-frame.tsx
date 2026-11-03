"use client";
import { useEffect, useRef } from "react";
import { exitExamFullscreen } from "../fullscreen";

export function ContestFocusFrame({ children }: { children: React.ReactNode }) {
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Strict Mode replays effects on entry; only release fullscreen on a real departure.
    if (leaveTimer.current !== null) clearTimeout(leaveTimer.current);
    return () => {
      leaveTimer.current = setTimeout(() => {
        void exitExamFullscreen();
      }, 0);
    };
  }, []);
  return (
    <main
      aria-label="Màn hình làm bài riêng"
      className="min-h-dvh bg-muted/30 px-3 py-4 sm:px-6 sm:py-6"
    >
      {children}
    </main>
  );
}
