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
import { queueTranscription, retryRecordingProcessing } from "../actions";
import type { ColumnState, RecordingTableData } from "./columns";

interface RecordingsDataTableMenuProps {
  recording: RecordingTableData;
  state: ColumnState;
}

export default function RecordingsDataTableMenu({
  recording,
  state,
}: RecordingsDataTableMenuProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isQueueingTranscription, setIsQueueingTranscription] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const result = await retryRecordingProcessing(recording.id);
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to retry processing",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleQueueTranscription = async () => {
    setIsQueueingTranscription(true);
    try {
      const result = await queueTranscription(recording.id);
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } finally {
      setIsQueueingTranscription(false);
    }
  };

  const canRetry = recording.status === "FAILED";
  const transcriptionStatus = recording.transcriptionStatus;
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
        {transcriptionStatus === "COMPLETED" && (
          <DropdownMenuItem onClick={() => state.openTranscript(recording)}>
            View transcript
          </DropdownMenuItem>
        )}
        {canQueueTranscription && (
          <DropdownMenuItem
            onClick={toastOnError(handleQueueTranscription)}
            disabled={isQueueingTranscription}
          >
            {transcriptionStatus === "FAILED" ? "Retry transcription" : "Transcribe"}
          </DropdownMenuItem>
        )}
        {canRetry && (
          <DropdownMenuItem onClick={toastOnError(handleRetry)} disabled={isRetrying}>
            {isRetrying ? "Retrying..." : "Retry Processing"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
