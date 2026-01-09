"use client";

import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { cn } from "#/lib/utils";
import type { SupervisorRecording } from "../actions";

interface ViewFeedbackDialogProps {
  recording: SupervisorRecording;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FidelityFeedbackItem {
  category?: string;
  score?: number | string;
  feedback?: string;
  comments?: string;
  [key: string]: unknown;
}

function getScoreColor(score: string | number | undefined): string {
  if (!score) return "bg-gray-100 text-gray-800";

  const numScore = typeof score === "string" ? Number.parseFloat(score) : score;

  if (Number.isNaN(numScore)) return "bg-gray-100 text-gray-800";

  if (numScore >= 80) return "bg-green-bg text-green-base border-green-border";
  if (numScore >= 60) return "bg-yellow-bg text-yellow-700 border-yellow-border";
  return "bg-red-bg text-red-base border-red-border";
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function FeedbackSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <h4 className="mb-3 font-medium text-shamiri-text-dark-grey">{title}</h4>
      {children}
    </div>
  );
}

export default function ViewFeedbackDialog({
  recording,
  open,
  onOpenChange,
}: ViewFeedbackDialogProps) {
  const feedback = recording.fidelityFeedback as
    | FidelityFeedbackItem[]
    | FidelityFeedbackItem
    | null;
  const hasArrayFeedback = Array.isArray(feedback);
  const hasObjectFeedback = feedback && typeof feedback === "object" && !Array.isArray(feedback);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fidelity Feedback</DialogTitle>
          <DialogDescription>
            AI analysis for {recording.fellowName} - {recording.sessionName}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Overall Score Section */}
          <FeedbackSection title="Overall Score">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn(
                  "px-4 py-2 text-lg font-semibold",
                  getScoreColor(recording.overallScore ?? undefined),
                )}
              >
                {recording.overallScore ?? "N/A"}
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

          {/* Recording Details Section */}
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

          {/* Detailed Feedback Section */}
          {hasArrayFeedback && feedback.length > 0 && (
            <FeedbackSection title="Detailed Feedback">
              <div className="space-y-4">
                {feedback.map((item, index) => (
                  <div key={index} className="rounded-md border p-3">
                    {item.category && (
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{item.category}</span>
                        {item.score !== undefined && (
                          <Badge
                            variant="outline"
                            className={cn("text-sm", getScoreColor(item.score))}
                          >
                            {item.score}
                          </Badge>
                        )}
                      </div>
                    )}
                    {(item.feedback || item.comments) && (
                      <p className="text-sm text-muted-foreground">
                        {item.feedback ?? item.comments}
                      </p>
                    )}
                    {/* Render any other properties */}
                    {Object.entries(item)
                      .filter(
                        ([key]) => !["category", "score", "feedback", "comments"].includes(key),
                      )
                      .map(([key, value]) => (
                        <div key={key} className="mt-2 text-sm">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}:
                          </span>
                          <span className="ml-2">{formatValue(value)}</span>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </FeedbackSection>
          )}

          {/* Object Feedback (non-array) */}
          {hasObjectFeedback && (
            <FeedbackSection title="Detailed Feedback">
              <div className="space-y-2 text-sm">
                {Object.entries(feedback).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b pb-2 last:border-0">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="max-w-[60%] text-right font-medium">
                      {typeof value === "object" ? (
                        <pre className="whitespace-pre-wrap text-left text-xs">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        formatValue(value)
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </FeedbackSection>
          )}

          {/* No Feedback Available */}
          {!feedback && (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              <Icons.info className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No detailed feedback available for this recording.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
