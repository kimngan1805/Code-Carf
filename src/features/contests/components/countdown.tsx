"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDuration } from "../time";

export function Countdown({
  target,
  serverNow,
}: {
  target: number;
  serverNow: number;
}) {
  const [now, setNow] = useState(serverNow);
  const router = useRouter();
  useEffect(() => {
    const receivedAt = performance.now();
    let refreshed = false;
    const tick = () => {
      const next = serverNow + performance.now() - receivedAt;
      setNow(next);
      if (next >= target && !refreshed) {
        refreshed = true;
        router.refresh();
      }
    };
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [serverNow, target, router]);
  return (
    <span
      className="font-mono text-3xl font-bold tabular-nums tracking-wider"
      role="timer"
      aria-label="Thời gian còn lại"
    >
      {formatDuration(target - now)}
    </span>
  );
}
