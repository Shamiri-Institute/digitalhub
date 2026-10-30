"use client";

import { Suspense, use } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import type { RecordingTranscript } from "../actions";
import type { RecordingTableData } from "./columns";

interface ViewTranscriptDialogProps {
  recording: RecordingTableData;
  transcript: Promise<RecordingTranscript | null | "failed">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function clockTime(seconds: number): string {
  const whole = Math.floor(seconds);
  const minutes = String(Math.floor((whole % 3600) / 60)).padStart(2, "0");
  const rest = String(whole % 60).padStart(2, "0");
  return whole >= 3600 ? `${Math.floor(whole / 3600)}:${minutes}:${rest}` : `${minutes}:${rest}`;
}

function TranscriptLines({
  transcript,
}: {
  transcript: Promise<RecordingTranscript | null | "failed">;
}) {
  const loaded = use(transcript);
  if (loaded === "failed") {
    return <p className="text-sm text-shamiri-light-red">The transcript could not be loaded.</p>;
  }
  if (!loaded?.segments || !loaded.gaps) {
    return <p className="text-sm text-shamiri-text-grey">No transcript is available.</p>;
  }

  const lines = [
    ...loaded.segments.map((segment) => ({ ...segment, gap: false })),
    ...loaded.gaps.map((gap) => ({ ...gap, text: "", gap: true })),
  ].toSorted((a, b) => a.start - b.start);

  return (
    <ol className="divide-y divide-grey-border rounded-md border border-grey-border">
      {lines.map((line) => (
        <li
          key={`${line.gap ? "gap" : "segment"}-${line.start}-${line.end}-${line.text}`}
          className="flex gap-3 px-3 py-2 text-sm"
        >
          <span className="w-16 shrink-0 font-mono text-shamiri-text-grey tabular-nums">
            {clockTime(line.start)}
          </span>
          {line.gap ? (
            <span className="text-shamiri-light-red italic">
              {clockTime(line.start)} to {clockTime(line.end)} not transcribed
            </span>
          ) : (
            <span className="text-shamiri-black">{line.text}</span>
          )}
        </li>
      ))}
    </ol>
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
            {recording.fellowName}, {recording.sessionName} ({recording.groupName})
          </DialogDescription>
        </DialogHeader>
        <Suspense fallback={<p className="text-sm text-shamiri-text-grey">Loading transcript…</p>}>
          <TranscriptLines transcript={transcript} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
