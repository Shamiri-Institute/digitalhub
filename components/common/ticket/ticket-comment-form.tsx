"use client";

import { FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/use-toast";
import { addTicketComment, startTicketAttachmentUploads } from "#/lib/actions/ticket/comments";
import { putWithProgress } from "#/lib/s3/put-with-progress";
import {
  formatFileSize,
  MAX_TICKET_ATTACHMENTS,
  MAX_TICKET_COMMENT_LENGTH,
  TICKET_ATTACHMENT_ACCEPT,
  ticketAttachmentContentTypeOf,
  ticketAttachmentProblem,
} from "#/lib/ticket-attachment-files";
import { cn } from "#/lib/utils";

// The comment box's frame, text area and toolbar, which every form in the composer shares. The
// frame takes the ring the app's inputs take, while its text area has focus.
export const composerBoxClass =
  "group rounded-md border border-input bg-white font-normal shadow-xs has-[textarea:focus]:ring-2 has-[textarea:focus]:ring-shamiri-new-blue has-[textarea:focus]:ring-offset-2";
export const composerTextareaClass =
  "block max-h-48 min-h-14 w-full resize-none bg-transparent px-3 pt-2.5 text-sm leading-6 field-sizing-content placeholder:text-shamiri-text-grey focus:outline-hidden disabled:opacity-60";
export const composerToolbarClass =
  "flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-background-secondary px-1.5 py-1.5";
export const composerErrorClass = "px-3 pb-2 text-sm text-pretty text-shamiri-light-red";

// Names the file whose upload failed, so the message can say which one.
class UploadFailed extends Error {}

type PendingFile = {
  id: string;
  file: File;
  contentType: string;
  problem: string | null;
  uploaded: number;
};

function pendingFile(file: File, tooMany: boolean): PendingFile {
  const contentType = ticketAttachmentContentTypeOf(file) ?? file.type;
  return {
    id: crypto.randomUUID(),
    file,
    contentType,
    problem: tooMany
      ? `Attach up to ${MAX_TICKET_ATTACHMENTS} files to a comment.`
      : ticketAttachmentProblem({ contentType, byteSize: file.size }),
    uploaded: 0,
  };
}

export function TicketCommentForm({ ticketId }: { ticketId: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  // Shown beside the box rather than in a toast, so it stays until the problem is fixed.
  const [error, setError] = useState<string | null>(null);

  const addFiles = (picked: File[]) => {
    setError(null);
    setFiles((current) => {
      const accepted = current.filter((f) => !f.problem).length;
      return [
        ...current,
        ...picked.map((file, i) => pendingFile(file, accepted + i >= MAX_TICKET_ATTACHMENTS)),
      ];
    });
  };
  const removeFile = (id: string) => {
    setError(null);
    setFiles((current) => current.filter((f) => f.id !== id));
  };
  const setUploaded = (id: string, uploaded: number) =>
    setFiles((current) => current.map((f) => (f.id === id ? { ...f, uploaded } : f)));

  const post = async () => {
    if (files.some((f) => f.problem)) {
      setError("Remove the files that can't be attached, then post again.");
      return;
    }
    setError(null);
    setIsPosting(true);
    try {
      let uploaded: { key: string; fileName: string }[] = [];
      if (files.length > 0) {
        const started = await startTicketAttachmentUploads(
          ticketId,
          files.map((f) => ({
            fileName: f.file.name,
            contentType: f.contentType,
            byteSize: f.file.size,
          })),
        );
        if (!started.success || !started.data) {
          setError(started.message);
          return;
        }
        const targets = started.data;
        await Promise.all(
          files.map((f, i) => {
            const target = targets[i];
            if (!target) throw new UploadFailed(f.file.name);
            return putWithProgress(
              target.url,
              target.headers,
              f.file,
              (bytes) => setUploaded(f.id, bytes),
              { stallMs: 30_000, answerMs: 30_000 },
            ).catch(() => {
              throw new UploadFailed(f.file.name);
            });
          }),
        );
        uploaded = files.map((f, i) => ({ key: targets[i]?.key ?? "", fileName: f.file.name }));
      }
      const result = await addTicketComment(ticketId, { body, files: uploaded });
      if (result.success) {
        toast({ description: result.message });
        setBody("");
        setFiles([]);
      } else {
        setError(result.message);
      }
    } catch (e) {
      setError(
        `${e instanceof UploadFailed ? e.message : "A file"} didn't finish uploading. Check your connection and try again.`,
      );
      setFiles((current) => current.map((f) => ({ ...f, uploaded: 0 })));
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <form
      noValidate
      aria-label="Add a comment"
      onSubmit={(e) => {
        e.preventDefault();
        void post();
      }}
      className={composerBoxClass}
    >
      <textarea
        aria-label="Add a comment"
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
        }}
        maxLength={MAX_TICKET_COMMENT_LENGTH}
        placeholder="Write a comment for everyone on this ticket"
        rows={2}
        disabled={isPosting}
        className={cn(composerTextareaClass, "max-sm:min-h-11 max-sm:pb-2 max-sm:focus:min-h-20")}
      />
      {files.length > 0 && (
        <ul aria-label="Files to attach" className="flex flex-wrap gap-2 px-3 pb-2">
          {files.map((f) => (
            <PendingFileChip
              key={f.id}
              pending={f}
              isPosting={isPosting}
              remove={() => removeFile(f.id)}
            />
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className={composerErrorClass}>
          {error}
        </p>
      )}
      {/* On phones the toolbar waits until the box is in use, to leave room for the thread. */}
      <div
        className={cn(
          composerToolbarClass,
          "max-sm:hidden max-sm:group-focus-within:flex max-sm:group-has-[li]:flex max-sm:group-has-[textarea:not(:placeholder-shown)]:flex",
        )}
      >
        <input
          ref={fileInput}
          type="file"
          aria-label="File"
          accept={TICKET_ATTACHMENT_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-sm text-shamiri-text-dark-grey max-sm:h-11"
          disabled={isPosting}
          onClick={() => fileInput.current?.click()}
        >
          <Paperclip aria-hidden className="h-4 w-4" />
          Attach
        </Button>
        {files.length > 0 && (
          <span className="hidden text-xs text-shamiri-text-dark-grey sm:inline">
            PNG, JPEG, WebP or PDF · 10 MB · {MAX_TICKET_ATTACHMENTS} files
          </span>
        )}
        {/* The count only matters near the limit. */}
        <span className="ml-auto text-xs tabular-nums text-shamiri-text-dark-grey">
          {body.length >= MAX_TICKET_COMMENT_LENGTH * 0.8 &&
            `${body.length} / ${MAX_TICKET_COMMENT_LENGTH}`}
        </span>
        <Button
          type="submit"
          variant="brand"
          className="h-8 max-sm:h-11"
          disabled={isPosting || (!body.trim() && files.length === 0)}
          loading={isPosting}
        >
          Post comment
        </Button>
      </div>
    </form>
  );
}

function PendingFileChip({
  pending,
  isPosting,
  remove,
}: {
  pending: PendingFile;
  isPosting: boolean;
  remove: () => void;
}) {
  const { file, problem, uploaded } = pending;
  const Icon = pending.contentType === "application/pdf" ? FileText : ImageIcon;
  return (
    <li
      className={cn(
        "relative flex max-w-full items-center gap-1.5 overflow-hidden rounded-md border bg-background-secondary py-1 pl-2 pr-1 text-sm",
        problem && "border-shamiri-light-red/40 bg-shamiri-light-red/5",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "h-4 w-4 shrink-0",
          problem ? "text-shamiri-light-red" : "text-shamiri-text-dark-grey",
        )}
      />
      <span className="truncate">{file.name}</span>
      {problem ? (
        <span className="text-xs font-medium text-shamiri-light-red">{problem}</span>
      ) : (
        <span className="shrink-0 text-xs tabular-nums text-shamiri-text-dark-grey">
          {isPosting ? `${formatFileSize(uploaded)} of ` : ""}
          {formatFileSize(file.size)}
        </span>
      )}
      {!isPosting && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-shamiri-text-dark-grey"
          aria-label={`Remove ${file.name}`}
          onClick={remove}
        >
          <X aria-hidden className="h-3.5 w-3.5" />
        </Button>
      )}
      {isPosting && !problem && (
        <progress
          aria-label={`Uploading ${file.name}`}
          value={uploaded}
          max={file.size || 1}
          className="absolute inset-x-0 bottom-0 h-0.5 w-full appearance-none bg-transparent [&::-moz-progress-bar]:bg-shamiri-new-blue [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-shamiri-new-blue"
        />
      )}
    </li>
  );
}
