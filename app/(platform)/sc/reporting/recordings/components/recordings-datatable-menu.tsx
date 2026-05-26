"use client";

import { useState } from "react";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { toast } from "#/components/ui/use-toast";
import { retryRecordingProcessing } from "../actions";
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

  const handleEdit = () => {
    state.setSelectedRecording(recording);
    state.setEditDialog(true);
  };

  const handleViewFeedback = () => {
    state.setSelectedRecording(recording);
    state.setViewFeedbackDialog(true);
  };

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

  const canRetry = recording.status === "FAILED";

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
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        {recording.fidelityFeedback != null ? (
          <DropdownMenuItem onClick={handleViewFeedback}>View Feedback</DropdownMenuItem>
        ) : null}
        {canRetry && (
          <DropdownMenuItem onClick={handleRetry} disabled={isRetrying}>
            {isRetrying ? "Retrying..." : "Retry Processing"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
