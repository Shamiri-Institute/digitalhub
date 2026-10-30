"use client";

import { Suspense, use } from "react";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import type { TranscriptSegment } from "#/lib/transcription/segment";
import type { RecordingTranscript } from "../actions";
import type { RecordingTableData } from "./columns";

export type TranscriptLoad = RecordingTranscript | "unavailable" | "failed";

interface ViewTranscriptDialogProps {
  recording: RecordingTableData;
  transcript: Promise<TranscriptLoad>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTime(seconds: number): string {
  const whole = Math.floor(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

const roleLabel = { facilitator: "Facilitator", student: "Student" } as const;

function transcriptText(segments: TranscriptSegment[]): string {
  return segments.map((s) => `[${formatTime(s.start)}] ${roleLabel[s.role]}: ${s.text}`).join("\n");
}

/** Keys from each segment's times and role; repeats (overlapping speech) get a counter. */
function segmentKeys(segments: TranscriptSegment[]): string[] {
  const seen = new Map<string, number>();
  return segments.map((s) => {
    const base = `${s.start}-${s.end}-${s.role}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  });
}

function TranscriptBody({ transcript }: { transcript: Promise<TranscriptLoad> }) {
  const loaded = use(transcript);

  if (loaded === "failed") {
    return <p className="text-sm text-shamiri-light-red">The transcript could not be loaded.</p>;
  }
  if (loaded === "unavailable") {
    return <p className="text-sm text-shamiri-text-grey">No transcript is available yet.</p>;
  }

  const { segments } = loaded;
  const keys = segmentKeys(segments);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcriptText(segments));
      toast({ description: "Transcript copied" });
    } catch {
      toast({ variant: "destructive", description: "Could not copy the transcript" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-shamiri-text-grey">
        <span>{segments.length} segments</span>
        <Button variant="outline" size="sm" onClick={toastOnError(handleCopy)}>
          Copy text
        </Button>
      </div>
      <ol className="divide-y divide-grey-border rounded-md border border-grey-border">
        {segments.map((segment, index) => (
          <li key={keys[index]} className="flex gap-3 px-3 py-2 text-sm">
            <span className="w-14 shrink-0 font-mono text-shamiri-text-grey tabular-nums">
              {formatTime(segment.start)}
            </span>
            <span
              className={cn(
                "w-20 shrink-0 font-medium",
                segment.role === "facilitator" ? "text-shamiri-new-blue" : "text-shamiri-green",
              )}
            >
              {roleLabel[segment.role]}
            </span>
            <span className="text-shamiri-black">{segment.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function ViewTranscriptDialog({
  recording,
  transcript,
  open,
  onOpenChange,
}: ViewTranscriptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transcript</DialogTitle>
          <DialogDescription>
            {recording.fellowName} - {recording.sessionName} ({recording.groupName})
          </DialogDescription>
        </DialogHeader>
        <Suspense
          fallback={<p className="text-sm text-shamiri-text-grey">Loading transcript...</p>}
        >
          <TranscriptBody transcript={transcript} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
