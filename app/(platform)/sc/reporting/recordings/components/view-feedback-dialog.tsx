"use client";

import { useState } from "react";
import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { cn } from "#/lib/utils";
import type { SupervisorRecording } from "../actions";
import FeedbackV1Content from "./feedback-v1-content";
import FeedbackV2Content from "./feedback-v2-content";
import { FeedbackSection, getScoreColor } from "./feedback-shared";
import type { V1FeedbackData, V2FeedbackData } from "./feedback-types";
import { SAMPLE_FEEDBACK } from "./sample-response";

interface ViewFeedbackDialogProps {
  recording: SupervisorRecording;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ViewFeedbackDialog({
  recording,
  open,
  onOpenChange,
}: ViewFeedbackDialogProps) {
  const [showSamplePreview, setShowSamplePreview] = useState(false);

  let feedback: V1FeedbackData | V2FeedbackData | null = null;
  try {
    const raw = recording.fidelityFeedback;
    feedback = typeof raw === "string"
      ? JSON.parse(raw)
      : (raw as unknown as V1FeedbackData | V2FeedbackData);
  } catch (error) {
    console.error("Failed to parse feedback:", error);
  }

  const effectiveVersion = showSamplePreview ? 1 : (recording.promptVersion ?? 1);
  const displayFeedback = showSamplePreview
    ? (SAMPLE_FEEDBACK as unknown as V1FeedbackData)
    : feedback;

  const overallScore =
    effectiveVersion === 2
      ? ((displayFeedback as V2FeedbackData)?.fidelity_scores?.overall_fidelity_score ??
          recording.overallScore ??
          undefined)
      : ((displayFeedback as V1FeedbackData)?.fidelity_scores?.overall_score ??
          recording.overallScore ??
          undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fidelity Feedback</DialogTitle>
          <DialogDescription>
            AI analysis for {recording.fellowName} - {recording.sessionName}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {process.env.NODE_ENV === "development" && !feedback && (
            <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
              <span className="text-sm font-medium text-blue-700">
                {showSamplePreview ? "Showing sample preview" : "No feedback data available"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSamplePreview(!showSamplePreview)}
              >
                {showSamplePreview ? "Hide Preview" : "Show Sample"}
              </Button>
            </div>
          )}

          <FeedbackSection title="Overall Score">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn("px-4 py-2 text-lg font-semibold", getScoreColor(overallScore))}
              >
                {overallScore ?? "N/A"}
              </Badge>
              {recording.processedAt && (
                <span className="text-sm text-muted-foreground">
                  Processed on{" "}
                  {new Date(recording.processedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </FeedbackSection>

          <FeedbackSection title="Recording Details">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Fellow:</span>
                <span className="ml-2 font-medium">{recording.fellowName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">School:</span>
                <span className="ml-2 font-medium">{recording.schoolName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Group:</span>
                <span className="ml-2 font-medium">{recording.groupName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Session:</span>
                <span className="ml-2 font-medium">{recording.sessionName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Session Date:</span>
                <span className="ml-2 font-medium">
                  {recording.sessionDate
                    ? new Date(recording.sessionDate).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">File:</span>
                <span className="ml-2 font-medium">{recording.originalFileName}</span>
              </div>
            </div>
          </FeedbackSection>

          {displayFeedback ? (
            effectiveVersion === 2 ? (
              <FeedbackV2Content feedback={displayFeedback as V2FeedbackData} />
            ) : (
              <FeedbackV1Content feedback={displayFeedback as V1FeedbackData} />
            )
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              <Icons.info className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No feedback available for this recording.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
