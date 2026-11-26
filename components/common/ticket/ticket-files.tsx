"use client";

import { FileText, ImageIcon } from "lucide-react";
import { useState } from "react";

import { toast } from "#/components/ui/use-toast";
import { getTicketAttachmentUrl } from "#/lib/actions/ticket/comments";
import type { TicketAttachment } from "#/lib/actions/ticket/types";
import { formatFileSize } from "#/lib/ticket-attachment-files";
import { cn } from "#/lib/utils";

/** A file's name, which opens a short-lived link to it in a new tab. */
export function TicketFileLink({
  attachment,
  className,
}: {
  attachment: TicketAttachment;
  className?: string;
}) {
  const [isOpening, setIsOpening] = useState(false);
  const Icon = attachment.contentType === "application/pdf" ? FileText : ImageIcon;

  const open = async () => {
    // Opened before the link arrives: a tab opened after an await is blocked as a popup.
    const tab = window.open("", "_blank");
    setIsOpening(true);
    const result = await getTicketAttachmentUrl(attachment.id);
    setIsOpening(false);
    if (!result.success || !result.data) {
      tab?.close();
      toast({ variant: "destructive", description: result.message });
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = result.data;
    } else {
      window.location.href = result.data;
    }
  };

  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <Icon aria-hidden className="h-4 w-4 shrink-0 text-shamiri-text-dark-grey" />
      <button
        type="button"
        onClick={() => void open()}
        aria-busy={isOpening}
        className="truncate text-shamiri-new-blue underline underline-offset-2 hover:no-underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue"
      >
        {attachment.fileName}
      </button>
      <span className="shrink-0 text-xs text-shamiri-text-dark-grey">
        {formatFileSize(attachment.byteSize)}
      </span>
    </span>
  );
}

export function TicketFileList({ attachments }: { attachments: TicketAttachment[] }) {
  return (
    <ul aria-label="Files" className="grid gap-1">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="min-w-0">
          <TicketFileLink attachment={attachment} />
        </li>
      ))}
    </ul>
  );
}
