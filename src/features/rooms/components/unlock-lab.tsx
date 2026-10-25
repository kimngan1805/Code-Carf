"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { LockKeyhole, LockKeyholeOpen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeRoomLab } from "../lab-actions";
import type { presentLab } from "../lab";

export function UnlockLab({
  initial,
}: {
  initial: Awaited<ReturnType<typeof presentLab>>;
}) {
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function run(command: Parameters<typeof changeRoomLab>[0]) {
    const previous = data;
    if (command.action === "toggle") {
      setData({ ...data, sequentialUnlock: command.enabled });
    }
    startTransition(async () => {
      setError("");
      setMessage("");
      const result = await changeRoomLab(command);
      if (result.data) {
        setData(result.data);
        setMessage("Đã cập nhật trạng thái từ server.");
      } else {
        setData(previous);
        setError(result.error ?? "Không thể cập nhật.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/paths"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Lộ trình học
        </Link>
        <h1 className="text-2xl font-bold text-primary">Thử mở khóa Room</h1>
        <p className="text-sm text-muted-foreground">
          Bộ thử nghiệm riêng gồm 3 Room. Các nút dưới đây chỉ thay đổi dữ liệu
          thử nghiệm của bạn, không thay đổi lộ trình đang học.
        </p>
      </div>
      <section className="space-y-4 rounded-2xl border bg-background p-4 sm:p-6">
        <label className="flex items-center gap-3 font-semibold">
          <input
            type="checkbox"
            checked={data.sequentialUnlock}
            disabled={pending}
            onChange={(event) =>
              run({ action: "toggle", enabled: event.target.checked })
            }
            className="size-5 accent-primary"
          />
          Mở khóa tuần tự
        </label>
        <p className="text-sm text-muted-foreground">
          {data.sequentialUnlock
            ? "Hoàn thành Room 1 để mở Room 2, rồi hoàn thành Room 2 để mở Room 3."
            : "Đã tắt: cả 3 Room đều mở, không cần hoàn thành Room trước."}
        </p>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run({ action: "reset" })}
        >
          Đặt lại bài test
        </Button>
      </section>
      <div
        role="status"
        aria-live="polite"
        className="text-sm text-muted-foreground"
      >
        {pending ? "Đang cập nhật..." : message}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ol className="space-y-4">
        {data.rooms.map((room) => {
          const Icon = room.accessible ? LockKeyholeOpen : LockKeyhole;
          return (
            <li
              key={room.id}
              className="space-y-4 rounded-2xl border bg-background p-4 sm:p-6"
            >
              <div className="flex items-start gap-3">
                <Icon
                  className="mt-1 size-5 shrink-0 text-primary"
                  aria-hidden
                />
                <div className="min-w-0 space-y-1">
                  <h2 className="font-semibold break-words">{room.title}</h2>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    {room.completed && <Check className="size-4" aria-hidden />}
                    {room.completed
                      ? "Đã hoàn thành"
                      : "Chưa hoàn thành"} ·{" "}
                    {room.accessible ? "Đang mở" : "Đang khóa"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={pending || (!room.completed && !room.accessible)}
                  variant={room.completed ? "secondary" : "default"}
                  onClick={() =>
                    run({
                      action: room.completed ? "undo" : "complete",
                      roomId: room.id,
                    })
                  }
                >
                  {room.completed ? "Bỏ hoàn thành" : "Hoàn thành Room"}
                </Button>
                <Button asChild variant="outline">
                  <Link
                    href={`/rooms/${room.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {room.accessible ? "Mở Room" : "Thử URL bị khóa"}
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-muted-foreground">
        Thử URL bị khóa sẽ mở tab mới. Server sẽ chặn truy cập. Sau khi hoàn
        thành Room trước hoặc tắt mở khóa tuần tự, mở lại cùng URL để kiểm tra.
      </p>
    </div>
  );
}
