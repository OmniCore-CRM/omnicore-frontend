"use client";

import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/types/models";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({
  attachments,
  downloadingId,
  onDownload,
  emptyText = "No attachments yet.",
  light = false,
}: {
  attachments?: Attachment[];
  downloadingId?: string | null;
  onDownload: (attachment: Attachment) => void;
  emptyText?: string;
  light?: boolean;
}) {
  if (!attachments?.length) {
    return (
      <p
        className={
          light
            ? "rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500"
            : "rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-3 text-sm text-oc-muted"
        }
      >
        {emptyText}
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className={
            light
              ? "flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-slate-950"
              : "flex min-w-0 items-center gap-3 rounded-lg border border-oc-border/60 bg-oc-bg/45 p-3 text-oc-text"
          }
        >
          <FileText className="h-5 w-5 shrink-0 opacity-70" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{attachment.fileName}</p>
            <p className="mt-0.5 text-xs opacity-60">
              {formatFileSize(attachment.fileSize)} ·{" "}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
              }).format(new Date(attachment.createdAt))}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 px-0"
            onClick={() => onDownload(attachment)}
            disabled={downloadingId === attachment.id}
            aria-label={`Download ${attachment.fileName}`}
          >
            {downloadingId === attachment.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}

export function InlineAttachmentItem({
  attachment,
  downloadingId,
  onDownload,
  align = "left",
  light = false,
}: {
  attachment: Attachment;
  downloadingId?: string | null;
  onDownload: (attachment: Attachment) => void;
  align?: "left" | "right";
  light?: boolean;
}) {
  return (
    <div
      className={`flex w-full ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      <div className="w-full max-w-[min(88%,560px)] sm:max-w-[min(78%,600px)]">
        <AttachmentList
          attachments={[attachment]}
          downloadingId={downloadingId}
          onDownload={onDownload}
          light={light}
        />
      </div>
    </div>
  );
}
