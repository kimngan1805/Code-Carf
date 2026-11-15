import { ShieldAlert } from "lucide-react";
import type { useContestEvents } from "./use-contest-events";
import { cn } from "@/lib/utils";

export function ProctoringNotice({
  state,
}: {
  state: ReturnType<typeof useContestEvents>;
}) {
  const { status, lastEvent, connectionLost } = state;
  const warning = status.flagged || !!lastEvent;
  if (!warning && !connectionLost) return null;
  return (
    <div
      role={warning ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-sm",
        warning ? "border-warning/40 bg-warning/10" : "bg-muted/40",
      )}
    >
      <ShieldAlert
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          warning ? "text-warning" : "text-muted-foreground",
        )}
      />
      <div className="space-y-1">
        <p className="font-semibold">
          {status.flagged
            ? "Lượt thi đã được gắn cờ để giáo viên xem xét"
            : lastEvent === "TAB_SWITCH"
              ? "Bạn vừa chuyển sang tab khác"
              : lastEvent === "FULLSCREEN_EXIT"
                ? "Bạn vừa thoát chế độ toàn màn hình"
                : lastEvent === "PASTE"
                  ? "Bạn vừa dán nội dung vào trang thi"
                  : "Cuộc thi có ghi nhận chuyển tab và dán code"}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          {status.flagged
            ? "Bạn vẫn có thể tiếp tục làm và nộp bài bình thường."
            : "Bạn vẫn có thể tiếp tục làm bài. Thống kê sẽ hiển thị khi xem kết quả."}
        </p>
        {connectionLost && (
          <p className="text-xs text-warning">
            Chưa đồng bộ được sự kiện. Bạn vẫn có thể tiếp tục làm bài.
          </p>
        )}
      </div>
    </div>
  );
}
