"use client";

import ReactMarkdown from "react-markdown";
import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import type { SafetyFlag } from "./feedback-types";

export function getScoreColor(score: string | number | undefined): string {
  if (!score) return "bg-gray-100 text-gray-800";
  const numScore = typeof score === "string" ? Number.parseFloat(score) : score;
  if (Number.isNaN(numScore)) return "bg-gray-100 text-gray-800";

  if (numScore >= 6) return "bg-green-bg text-green-base border-green-border";
  if (numScore >= 3) return "bg-yellow-bg text-yellow-700 border-yellow-border";
  return "bg-red-bg text-red-base border-red-border";
}

export function FeedbackSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <h4 className="mb-3 font-medium text-shamiri-text-dark-grey">{title}</h4>
      {children}
    </div>
  );
}

export function MarkdownText({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <>{children}</>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

interface ScoreCardProps {
  questionKey: string;
  score: string | number | undefined;
  justification: string;
  extraContent?: React.ReactNode;
}

export function ScoreCard({ questionKey, score, justification, extraContent }: ScoreCardProps) {
  const label = questionKey.replace(/_/g, " ").replace("question ", "Question ");

  return (
    <div className="rounded-md border p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium capitalize">{label}</span>
        {score !== undefined && (
          <Badge variant="outline" className={cn("text-sm", getScoreColor(score))}>
            Score: {score}
          </Badge>
        )}
      </div>
      {justification && (
        <p className="text-sm text-muted-foreground mt-2">
          <MarkdownText>{justification}</MarkdownText>
        </p>
      )}
      {extraContent}
    </div>
  );
}

export function SafetyFlagsSection({ flags }: { flags: SafetyFlag[] }) {
  if (!flags || flags.length === 0) return null;

  return (
    <FeedbackSection title="Safety Flags">
      <div className="space-y-3">
        {flags.map((flag, idx) => (
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
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                  Follow-up Required
                </Badge>
              )}
            </div>
            <p className="text-sm mb-2">
              <MarkdownText>{flag.description}</MarkdownText>
            </p>
            {flag.timestamp_reference && (
              <p className="text-xs text-muted-foreground">Timestamp: {flag.timestamp_reference}</p>
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
  );
}
