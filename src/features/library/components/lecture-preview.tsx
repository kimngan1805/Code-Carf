"use client";

import { useState } from "react";
import { Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "./modal";

/** Nút Xem bài giảng: phát video, mở PDF ngay trong trang; slide và Word thì tải về. */
export function LecturePreview({
  lecture,
}: {
  lecture: {
    id: string;
    kind: "VIDEO" | "PDF" | "SLIDE" | "DOC";
    title: string;
    youtubeId: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const fileUrl = `/api/library/files/${lecture.id}`;
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="rounded-lg"
      >
        <Eye className="size-3.5" aria-hidden />
        Xem
      </Button>
      {open && (
        <Modal
          wide
          title={lecture.title}
          onClose={() => setOpen(false)}
          footer={
            lecture.kind !== "VIDEO" ? (
              <Button asChild size="sm" variant="outline">
                <a href={`${fileUrl}?download=1`}>
                  <Download className="size-4" aria-hidden />
                  Tải về
                </a>
              </Button>
            ) : undefined
          }
        >
          {lecture.kind === "VIDEO" && lecture.youtubeId ? (
            <div className="aspect-video bg-foreground">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${lecture.youtubeId}`}
                title={lecture.title}
                className="size-full"
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : lecture.kind === "PDF" ? (
            <iframe
              src={fileUrl}
              title={lecture.title}
              className="h-[70vh] w-full"
            />
          ) : (
            <div className="space-y-2 p-8 text-center">
              <p className="font-semibold">
                {lecture.kind === "SLIDE"
                  ? "Slide PowerPoint"
                  : "Tài liệu Word"}{" "}
                chưa xem trực tiếp được
              </p>
              <p className="text-sm text-muted-foreground">
                Trình duyệt không tự mở file Office. Tải về để xem, hoặc xuất
                sang PDF rồi tải lên để học viên xem ngay trong bài.
              </p>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
