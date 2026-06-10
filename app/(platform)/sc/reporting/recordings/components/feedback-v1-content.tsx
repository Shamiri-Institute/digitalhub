"use client";

import type { V1FeedbackData } from "./feedback-types";
import {
  FeedbackSection,
  MarkdownText,
  SafetyFlagsSection,
  ScoreCard,
} from "./feedback-shared";

interface FeedbackV1ContentProps {
  feedback: V1FeedbackData;
}

export default function FeedbackV1Content({ feedback }: FeedbackV1ContentProps) {
  const sortedQuestions = feedback.fidelity_scores
    ? Object.entries(feedback.fidelity_scores)
        .filter(([key]) => key.startsWith("question_"))
        .sort(([keyA], [keyB]) => {
          const numA = Number.parseInt(keyA.match(/question_(\d+)/)?.[1] || "0", 10);
          const numB = Number.parseInt(keyB.match(/question_(\d+)/)?.[1] || "0", 10);
          return numA - numB;
        })
    : [];

  return (
    <>
      {/* Fidelity Scores */}
      {feedback.fidelity_scores && (
        <FeedbackSection title="Fidelity Scores">
          <div className="space-y-4">
            {sortedQuestions.map(([key, value]) => {
              const questionScore = value as { score: number; justification: string };
              return (
                <ScoreCard
                  key={key}
                  questionKey={key}
                  score={questionScore?.score}
                  justification={questionScore?.justification ?? ""}
                />
              );
            })}

            {feedback.fidelity_scores.overall_assessment && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                <h5 className="font-medium mb-2">Overall Assessment</h5>
                <p className="text-sm">
                  <MarkdownText>
                    {feedback.fidelity_scores.overall_assessment}
                  </MarkdownText>
                </p>
              </div>
            )}
          </div>
        </FeedbackSection>
      )}

      {/* Recommendations */}
      {feedback.recommendations && feedback.recommendations.length > 0 && (
        <FeedbackSection title="Recommendations">
          <ul className="space-y-2">
            {feedback.recommendations.map((rec, idx) => (
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
      {feedback.qualitative_feedback && (
        <FeedbackSection title="Qualitative Feedback">
          <div className="space-y-4">
            {feedback.qualitative_feedback.strengths && (
              <div>
                <h5 className="font-medium text-green-700 mb-2">Strengths</h5>
                <ul className="list-disc pl-5 space-y-1">
                  {feedback.qualitative_feedback.strengths.map((strength, idx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: read-only server feedback list; composite key disambiguates potential duplicate text
                    <li key={`${idx}-${strength.slice(0, 40)}`} className="text-sm">
                      <MarkdownText>{strength}</MarkdownText>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.qualitative_feedback.session_summary && (
              <div>
                <h5 className="font-medium mb-2">Session Summary</h5>
                <p className="text-sm text-muted-foreground">
                  <MarkdownText>{feedback.qualitative_feedback.session_summary}</MarkdownText>
                </p>
              </div>
            )}

            {feedback.qualitative_feedback.areas_for_improvement && (
              <div>
                <h5 className="font-medium text-amber-700 mb-2">Areas for Improvement</h5>
                <ul className="list-disc pl-5 space-y-1">
                  {feedback.qualitative_feedback.areas_for_improvement.map((area, idx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: read-only server feedback list; composite key disambiguates potential duplicate text
                    <li key={`${idx}-${area.slice(0, 40)}`} className="text-sm">
                      <MarkdownText>{area}</MarkdownText>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.qualitative_feedback.session_flow_and_engagement && (
              <div>
                <h5 className="font-medium mb-2">Session Flow and Engagement</h5>
                <p className="text-sm text-muted-foreground">
                  <MarkdownText>
                    {feedback.qualitative_feedback.session_flow_and_engagement}
                  </MarkdownText>
                </p>
              </div>
            )}
          </div>
        </FeedbackSection>
      )}

      {/* Safety Flags */}
      <SafetyFlagsSection flags={feedback.safety_flags} />
    </>
  );
}
