"use client";

import { useState } from "react";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { queueTranscription } from "../actions";
import type { ColumnState, RecordingTableData } from "./columns";

interface RecordingsDataTableMenuProps {
  recording: RecordingTableData;
  state: ColumnState;
}

export default function RecordingsDataTableMenu({
  recording,
  state,
}: RecordingsDataTableMenuProps) {
  const [isQueueing, setIsQueueing] = useState(false);

  const handleQueueTranscription = async () => {
    setIsQueueing(true);
    try {
      const result = await queueTranscription(recording.id);
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } finally {
      setIsQueueing(false);
    }
  };

  const { transcriptionStatus } = recording;
  const canQueueTranscription =
    state.transcriptionEnabled &&
    (transcriptionStatus === null || transcriptionStatus === "FAILED");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="absolute inset-0 flex cursor-pointer items-center justify-center border-l bg-white p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-shamiri-new-blue/60 focus-visible:ring-inset"
        >
          <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
          <span className="sr-only">Open menu</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => state.openDialog("edit", recording)}>
          Edit
        </DropdownMenuItem>
        {recording.fidelityFeedback != null ? (
          <DropdownMenuItem onClick={() => state.openDialog("viewFeedback", recording)}>
            View Feedback
          </DropdownMenuItem>
        ) : null}
        {state.transcriptionEnabled && transcriptionStatus === "COMPLETED" ? (
          <DropdownMenuItem onClick={() => state.openDialog("viewTranscript", recording)}>
            View transcript
          </DropdownMenuItem>
        ) : null}
        {canQueueTranscription && (
          <DropdownMenuItem onClick={toastOnError(handleQueueTranscription)} disabled={isQueueing}>
            {transcriptionStatus === "FAILED" ? "Retry transcription" : "Transcribe"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
