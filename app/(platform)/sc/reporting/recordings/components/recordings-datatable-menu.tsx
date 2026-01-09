"use client";

import { useState } from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
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

  const canViewFeedback = recording.status === "COMPLETED" && Boolean(recording.fidelityFeedback);
  const canRetry = recording.status === "FAILED";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Icons.moreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canViewFeedback && (
          <DropdownMenuItem onClick={handleViewFeedback}>
            <Icons.eye className="mr-2 h-4 w-4" />
            View Feedback
          </DropdownMenuItem>
        )}
        {canRetry && (
          <DropdownMenuItem onClick={handleRetry} disabled={isRetrying}>
            <Icons.refreshCw className="mr-2 h-4 w-4" />
            {isRetrying ? "Retrying..." : "Retry Processing"}
          </DropdownMenuItem>
        )}
        {!canViewFeedback && !canRetry && (
          <DropdownMenuItem disabled>
            <Icons.clock className="mr-2 h-4 w-4" />
            {recording.status === "PENDING" ? "Awaiting processing" : "Processing..."}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
