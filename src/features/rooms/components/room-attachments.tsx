import { Download, ExternalLink, FileText, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ATTACHMENT_TYPES,
  attachmentExt,
  formatFileSize,
} from "../attachment-rules";
import type { RoomAttachmentItem } from "../attachments";

export function attachmentHref(roomId: string, attachmentId: string) {
  return `/api/rooms/${encodeURIComponent(roomId)}/attachments/${encodeURIComponent(attachmentId)}`;
}

export function AttachmentIcon({ contentType }: { contentType: string }) {
  const Icon = attachmentExt(contentType) === "pptx" ? Presentation : FileText;
  return <Icon className="size-5 shrink-0 text-primary" aria-hidden />;
}

export function attachmentLabel(contentType: string) {
  const ext = attachmentExt(contentType);
  return ext ? ATTACHMENT_TYPES[ext].label : "Tệp";
}

/** Lecture files on the lesson page: PDFs open inside the page, slides and documents download. */
export function RoomAttachments({
  roomId,
  attachments,
}: {
  roomId: string;
  attachments: RoomAttachmentItem[];
}) {
  if (!attachments.length) return null;
  const firstPdf = attachments.find(
    (file) => attachmentExt(file.contentType) === "pdf",
  );
  return (
    <section className="space-y-4" aria-labelledby="attachments-title">
      <h2 id="attachments-title" className="text-xl font-semibold">
        Tài liệu bài giảng ({attachments.length})
      </h2>
      <ul className="space-y-3">
        {attachments.map((file) => {
          const href = attachmentHref(roomId, file.id);
          const isPdf = attachmentExt(file.contentType) === "pdf";
          return (
            <li
              key={file.id}
              className="min-w-0 rounded-2xl border bg-background p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <AttachmentIcon contentType={file.contentType} />
                  <div className="min-w-0">
                    <p className="font-semibold break-words">{file.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {attachmentLabel(file.contentType)} ·{" "}
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isPdf && (
                    <Button asChild variant="outline" size="sm">
                      <a href={href} target="_blank" rel="noopener">
                        <ExternalLink className="size-4" aria-hidden />
                        Mở tab mới
                      </a>
                    </Button>
                  )}
                  <Button asChild size="sm">
                    <a href={`${href}?download=1`} download={file.fileName}>
                      <Download className="size-4" aria-hidden />
                      Tải về
                    </a>
                  </Button>
                </div>
              </div>
              {isPdf && (
                <details
                  className="mt-4 border-t pt-3"
                  open={file.id === firstPdf?.id}
                >
                  <summary className="cursor-pointer rounded text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-ring">
                    Xem tài liệu
                  </summary>
                  <iframe
                    src={href}
                    title={`Tài liệu: ${file.fileName}`}
                    loading="lazy"
                    className="mt-4 h-[75vh] min-h-96 w-full rounded-xl border bg-muted/20"
                  />
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
