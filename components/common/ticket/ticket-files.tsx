"use client";

import { FileText, ImageIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/use-toast";
import { getTicketAttachmentUrl } from "#/lib/actions/ticket/comments";
import type { TicketAttachment } from "#/lib/actions/ticket/types";
import { formatFileSize } from "#/lib/ticket-attachment-files";
import { cn } from "#/lib/utils";

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
      <Button
        type="button"
        variant="link"
        onClick={() => void open()}
        aria-busy={isOpening}
        className="h-auto min-w-0 shrink p-0 font-normal text-shamiri-new-blue underline underline-offset-2 hover:no-underline"
      >
        <span className="truncate">{attachment.fileName}</span>
      </Button>
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
