"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
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
import { SAMPLE_FEEDBACK } from "./sample-response";

interface ViewFeedbackDialogProps {
  recording: SupervisorRecording;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface QuestionScore {
  score: number;
  justification: string;
}

interface FidelityScores {
  overall_score: string;
  overall_assessment: string;
  [key: string]: string | QuestionScore | unknown;
}

interface QualitativeFeedback {
  strengths?: string[];
  session_summary?: string;
  areas_for_improvement?: string[];
  session_flow_and_engagement?: string;
}

interface SafetyFlag {
  type: string;
  description: string;
  timestamp_reference?: string;
  severity?: string;
  immediate_action_needed?: boolean;
  context_analysis?: string;
  current_vs_past?: string;
  confidence_level?: string;
  requires_follow_up?: boolean;
}

interface FeedbackData {
  safety_flags: SafetyFlag[];
  fidelity_scores: FidelityScores;
  recommendations: string[];
  qualitative_feedback: QualitativeFeedback;
}

function getScoreColor(score: string | number | undefined): string {
  if (!score) return "bg-gray-100 text-gray-800";
  const numScore = typeof score === "string" ? Number.parseFloat(score) : score;
  if (Number.isNaN(numScore)) return "bg-gray-100 text-gray-800";

  if (numScore >= 6) return "bg-green-bg text-green-base border-green-border";
  if (numScore >= 3) return "bg-yellow-bg text-yellow-700 border-yellow-border";
  return "bg-red-bg text-red-base border-red-border";
}

function FeedbackSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <h4 className="mb-3 font-medium text-shamiri-text-dark-grey">{title}</h4>
      {children}
    </div>
  );
}

// Component for rendering markdown text inline
function MarkdownText({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <>{children}</>, // Remove wrapper <p> tags for inline rendering
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

export default function ViewFeedbackDialog({
  recording,
  open,
  onOpenChange,
}: ViewFeedbackDialogProps) {
  const [showSamplePreview, setShowSamplePreview] = useState(false);

  // Parse feedback - it's either already an object or a JSON string
  let feedback: FeedbackData | null = null;
  try {
    const raw = recording.fidelityFeedback;
    feedback = typeof raw === "string" ? JSON.parse(raw) : (raw as unknown as FeedbackData);
  } catch (error) {
    console.error("Failed to parse feedback:", error);
  }

  // Use sample data if preview is enabled
  const displayFeedback = showSamplePreview ? SAMPLE_FEEDBACK : feedback;
  const overallScore =
    displayFeedback?.fidelity_scores?.overall_score ?? recording.overallScore ?? undefined;

  // Sort question entries by question number
  const sortedQuestions = displayFeedback?.fidelity_scores
    ? Object.entries(displayFeedback.fidelity_scores)
        .filter(([key]) => key.startsWith("question_"))
        .sort(([keyA], [keyB]) => {
          const numA = Number.parseInt(keyA.match(/question_(\d+)/)?.[1] || "0", 10);
          const numB = Number.parseInt(keyB.match(/question_(\d+)/)?.[1] || "0", 10);
          return numA - numB;
        })
    : [];

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
          {/* Sample Preview Toggle (Development Only) */}
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

          {/* Overall Score */}
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

          {/* Recording Details */}
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
            <>
              {/* Fidelity Scores */}
              {displayFeedback.fidelity_scores && (
                <FeedbackSection title="Fidelity Scores">
                  <div className="space-y-4">
                    {/* Individual question scores - sorted */}
                    {sortedQuestions.map(([key, value]) => {
                      const questionScore = value as QuestionScore;
                      return (
                        <div key={key} className="rounded-md border p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-medium capitalize">
                              {key.replace(/_/g, " ").replace("question ", "Question ")}
                            </span>
                            {questionScore?.score !== undefined && (
                              <Badge
                                variant="outline"
                                className={cn("text-sm", getScoreColor(questionScore.score))}
                              >
                                Score: {questionScore.score}
                              </Badge>
                            )}
                          </div>
                          {questionScore?.justification && (
                            <p className="text-sm text-muted-foreground mt-2">
                              <MarkdownText>{questionScore.justification}</MarkdownText>
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {/* Overall Assessment */}
                    {displayFeedback.fidelity_scores.overall_assessment && (
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                        <h5 className="font-medium mb-2">Overall Assessment</h5>
                        <p className="text-sm">
                          <MarkdownText>
                            {displayFeedback.fidelity_scores.overall_assessment}
                          </MarkdownText>
                        </p>
                      </div>
                    )}
                  </div>
                </FeedbackSection>
              )}

              {/* Recommendations */}
              {displayFeedback.recommendations && displayFeedback.recommendations.length > 0 && (
                <FeedbackSection title="Recommendations">
                  <ul className="space-y-2">
                    {displayFeedback.recommendations.map((rec, idx) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: read-only server feedback list; composite key disambiguates potential duplicate text
                      <li key={`${idx}-${rec.slice(0, 40)}`} className="flex gap-2 text-sm">
                        <span className="font-semibold text-blue-600 mt-0.5">{idx + 1}.</span>
                        <span>
                          <MarkdownText>{rec}</MarkdownText>
                        </span>
                      </li>
                    ))}
                  </ul>
                </FeedbackSection>
              )}

              {/* Qualitative Feedback */}
              {displayFeedback.qualitative_feedback && (
                <FeedbackSection title="Qualitative Feedback">
                  <div className="space-y-4">
                    {displayFeedback.qualitative_feedback.strengths && (
                      <div>
                        <h5 className="font-medium text-green-700 mb-2">Strengths</h5>
                        <ul className="list-disc pl-5 space-y-1">
                          {displayFeedback.qualitative_feedback.strengths.map((strength, idx) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: read-only server feedback list; composite key disambiguates potential duplicate text
                            <li key={`${idx}-${strength.slice(0, 40)}`} className="text-sm">
                              <MarkdownText>{strength}</MarkdownText>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {displayFeedback.qualitative_feedback.session_summary && (
                      <div>
                        <h5 className="font-medium mb-2">Session Summary</h5>
                        <p className="text-sm text-muted-foreground">
                          <MarkdownText>
                            {displayFeedback.qualitative_feedback.session_summary}
                          </MarkdownText>
                        </p>
                      </div>
                    )}

                    {displayFeedback.qualitative_feedback.areas_for_improvement && (
                      <div>
                        <h5 className="font-medium text-amber-700 mb-2">Areas for Improvement</h5>
                        <ul className="list-disc pl-5 space-y-1">
                          {displayFeedback.qualitative_feedback.areas_for_improvement.map(
                            (area, idx) => (
                              // biome-ignore lint/suspicious/noArrayIndexKey: read-only server feedback list; composite key disambiguates potential duplicate text
                              <li key={`${idx}-${area.slice(0, 40)}`} className="text-sm">
                                <MarkdownText>{area}</MarkdownText>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {displayFeedback.qualitative_feedback.session_flow_and_engagement && (
                      <div>
                        <h5 className="font-medium mb-2">Session Flow and Engagement</h5>
                        <p className="text-sm text-muted-foreground">
                          <MarkdownText>
                            {displayFeedback.qualitative_feedback.session_flow_and_engagement}
                          </MarkdownText>
                        </p>
                      </div>
                    )}
                  </div>
                </FeedbackSection>
              )}

              {/* Safety Flags */}
              {displayFeedback.safety_flags && displayFeedback.safety_flags.length > 0 && (
                <FeedbackSection title="Safety Flags">
                  <div className="space-y-3">
                    {displayFeedback.safety_flags.map((flag, idx) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: read-only server feedback list; idx disambiguates duplicate type+severity combos
                        key={`${flag.type}-${flag.severity ?? ""}-${idx}`}
                        className="rounded-md border border-red-200 bg-red-50 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-semibold text-red-700 capitalize">
                            {flag.type} {flag.severity && `- ${flag.severity} severity`}
                          </span>
                          {flag.requires_follow_up && (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-300"
                            >
                              Follow-up Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mb-2">
                          <MarkdownText>{flag.description}</MarkdownText>
                        </p>
                        {flag.timestamp_reference && (
                          <p className="text-xs text-muted-foreground">
                            Timestamp: {flag.timestamp_reference}
                          </p>
                        )}
                        {flag.context_analysis && (
                          <div className="mt-2 pt-2 border-t border-red-200">
                            <p className="text-xs text-muted-foreground">
                              <MarkdownText>{flag.context_analysis}</MarkdownText>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </FeedbackSection>
              )}
            </>
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
