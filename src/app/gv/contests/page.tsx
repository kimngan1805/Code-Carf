import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getManagedContestWarnings } from "@/features/proctoring/management";
import { ThresholdForm } from "@/features/proctoring/components/threshold-form";
import { formatContestDate } from "@/features/contests/time";

export default async function ManagedContestWarningsPage() {
  const contests = await getManagedContestWarnings();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Giám sát cuộc thi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cấu hình cảnh báo và xem các lượt thi cần xem xét. Cờ vi phạm không tự
          hủy bài hay trừ điểm.
        </p>
      </header>
      {contests.length === 0 && (
        <p className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Bạn chưa có cuộc thi để quản lý.
        </p>
      )}
      {contests.map((contest) => (
        <section
          key={contest.slug}
          className="space-y-5 rounded-2xl border bg-background p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              <Link
                className="text-primary underline-offset-4 hover:underline"
                href={`/contests/${contest.slug}`}
              >
                {contest.title}
              </Link>
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-warning">
                <ShieldAlert aria-hidden className="size-4" />
                {contest._count.participants} lượt cần xem xét
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href={`/gv/contests/${contest.slug}`}>
                  Dashboard vi phạm
                </Link>
              </Button>
            </div>
          </div>
          <ThresholdForm
            slug={contest.slug}
            threshold={contest.violationThreshold}
          />
          {contest.participants.length > 0 && (
            <div className="overflow-x-auto border-t pt-4">
              <p className="mb-3 text-xs text-muted-foreground">
                20 lượt gắn cờ gần nhất
              </p>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="pb-2 pr-4">Thí sinh</th>
                    <th className="pb-2 pr-4">Số lần</th>
                    <th className="pb-2">Gắn cờ lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {contest.participants.map((participant) => (
                    <tr key={participant.userId} className="border-t">
                      <td className="py-3 pr-4">{participant.user.name}</td>
                      <td className="py-3 pr-4 font-semibold">
                        {participant.violationCount}
                      </td>
                      <td className="py-3 text-xs">
                        {formatContestDate(participant.flaggedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
