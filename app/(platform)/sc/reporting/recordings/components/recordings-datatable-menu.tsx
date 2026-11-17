"use client";

import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "#/components/ui/dropdown-menu";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { retryFeedback, retryTranscription } from "../actions";
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

  const handleRetry = async (retry: typeof retryTranscription) => {
    setIsRetrying(true);
    try {
      const result = await retry(recording.id);
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const { transcriptionStatus, ratingStatus } = recording;
  const canRetryTranscription = state.transcriptionEnabled && transcriptionStatus === "FAILED";
  const canRetryFeedback = state.transcriptionEnabled && ratingStatus === "FAILED";

  return (
    <DropdownMenu>
      <RowActionsTrigger label={`Actions for ${recording.originalFileName}`} className="bg-white" />
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
        {canRetryTranscription && (
          <DropdownMenuItem
            onClick={toastOnError(() => handleRetry(retryTranscription))}
            disabled={isRetrying}
          >
            Retry transcription
          </DropdownMenuItem>
        )}
        {canRetryFeedback && (
          <DropdownMenuItem
            onClick={toastOnError(() => handleRetry(retryFeedback))}
            disabled={isRetrying}
          >
            Retry feedback
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
