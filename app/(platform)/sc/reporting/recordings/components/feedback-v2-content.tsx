"use client";

import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import { FeedbackSection, MarkdownText, SafetyFlagsSection, ScoreCard } from "./feedback-shared";
import type { V2CompetencyItem, V2FeedbackData } from "./feedback-types";

interface FeedbackV2ContentProps {
  feedback: V2FeedbackData;
}

export default function FeedbackV2Content({ feedback }: FeedbackV2ContentProps) {
  const sortedQuestions = feedback.fidelity_scores
    ? Object.entries(feedback.fidelity_scores)
        .filter(([key]) => key.startsWith("question_"))
        .sort(([keyA], [keyB]) => {
          const numA = Number.parseInt(keyA.match(/question_(\d+)/)?.[1] || "0", 10);
          const numB = Number.parseInt(keyB.match(/question_(\d+)/)?.[1] || "0", 10);
          return numA - numB;
        })
    : [];

  const sortedCompetencies = feedback.competency_profile
    ? Object.entries(feedback.competency_profile)
        .filter(([key]) => key.startsWith("B"))
        .sort(([keyA], [keyB]) => {
          const numA = Number.parseInt(keyA.match(/B(\d+)/)?.[1] || "0", 10);
          const numB = Number.parseInt(keyB.match(/B(\d+)/)?.[1] || "0", 10);
          return numA - numB;
        })
    : [];

  const supervisionBrief = feedback.supervision_preparation_brief;
  const wellnessFlag = supervisionBrief?.fellow_wellness_flag;

  return (
    <>
      {/* Session Participation */}
      {feedback.session_participation && (
        <FeedbackSection title="Session Participation">
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Estimated Speakers:</span>
                <span className="ml-2 font-medium">
                  {feedback.session_participation.estimated_speakers}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Fellow Speaking Time:</span>
                <span className="ml-2 font-medium">
                  {feedback.session_participation.lead_fellow_speaking_time} (
                  {feedback.session_participation.lead_fellow_speaking_percentage})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Student Speaking Time:</span>
                <span className="ml-2 font-medium">
                  {feedback.session_participation.total_student_speaking_time}
                </span>
              </div>
            </div>

            {feedback.session_participation.participation_distribution && (
              <div className="rounded-md border p-4">
                <h5 className="font-medium mb-2">Participation Distribution</h5>
                <p className="text-sm text-muted-foreground">
                  <MarkdownText>
                    {feedback.session_participation.participation_distribution}
                  </MarkdownText>
                </p>
              </div>
            )}

            {feedback.session_participation.prosodic_observations && (
              <div className="rounded-md border p-4">
                <h5 className="font-medium mb-2">Prosodic Observations</h5>
                <p className="text-sm text-muted-foreground">
                  <MarkdownText>
                    {feedback.session_participation.prosodic_observations}
                  </MarkdownText>
                </p>
              </div>
            )}
          </div>
        </FeedbackSection>
      )}

      {/* Fidelity Scores */}
      {feedback.fidelity_scores && (
        <FeedbackSection title="Fidelity Scores">
          <div className="space-y-4">
            {sortedQuestions.map(([key, value]) => {
              const questionScore = value as {
                score: string;
                justification: string;
                open_closed_question_ratio?: string;
              };
              return (
                <ScoreCard
                  key={key}
                  questionKey={key}
                  score={questionScore?.score}
                  justification={questionScore?.justification ?? ""}
                  extraContent={
                    questionScore?.open_closed_question_ratio ? (
                      <p className="text-xs text-muted-foreground mt-2">
                        Open/closed question ratio: {questionScore.open_closed_question_ratio}
                      </p>
                    ) : undefined
                  }
                />
              );
            })}

            {feedback.fidelity_scores.overall_fidelity_summary && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                <h5 className="font-medium mb-2">Overall Assessment</h5>
                <p className="text-sm">
                  <MarkdownText>{feedback.fidelity_scores.overall_fidelity_summary}</MarkdownText>
                </p>
              </div>
            )}
          </div>
        </FeedbackSection>
      )}

      {/* Competency Profile */}
      {sortedCompetencies.length > 0 && (
        <FeedbackSection title="Competency Profile">
          <div className="space-y-4">
            {sortedCompetencies.map(([key, value]) => {
              const competency = value as V2CompetencyItem;
              return (
                <div key={key} className="rounded-md border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium capitalize">{key.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm">
                        {competency.estimated_level}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {competency.confidence} confidence
                      </span>
                    </div>
                  </div>
                  {competency.observed_behaviours && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <MarkdownText>{competency.observed_behaviours}</MarkdownText>
                    </p>
                  )}
                  {competency.level_framing && (
                    <p className="text-xs text-muted-foreground italic mt-2">
                      <MarkdownText>{competency.level_framing}</MarkdownText>
                    </p>
                  )}
                  {competency.confidence_note && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      <MarkdownText>{competency.confidence_note}</MarkdownText>
                    </p>
                  )}
                </div>
              );
            })}

            {/* Red Flag Check */}
            {feedback.competency_profile.red_flag_check && (
              <div
                className={cn(
                  "rounded-md border p-4",
                  feedback.competency_profile.red_flag_check.any_critical_L1
                    ? "border-red-200 bg-red-50"
                    : "border-green-200 bg-green-50",
                )}
              >
                <h5
                  className={cn(
                    "font-medium mb-2",
                    feedback.competency_profile.red_flag_check.any_critical_L1
                      ? "text-red-700"
                      : "text-green-700",
                  )}
                >
                  Red Flag Check
                </h5>
                <p className="text-sm">
                  {feedback.competency_profile.red_flag_check.any_critical_L1
                    ? `Critical L1 flagged: ${feedback.competency_profile.red_flag_check.flagged_domains.join(", ")}`
                    : "No critical L1 competencies flagged"}
                </p>
                {feedback.competency_profile.red_flag_check.recommendation && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <MarkdownText>
                      {feedback.competency_profile.red_flag_check.recommendation}
                    </MarkdownText>
                  </p>
                )}
              </div>
            )}
          </div>
        </FeedbackSection>
      )}

      {/* Supervision Preparation Brief */}
      {supervisionBrief && (
        <FeedbackSection title="Supervision Preparation Brief">
          <div className="space-y-4">
            {/* Strengths to Acknowledge */}
            {supervisionBrief.strengths_to_acknowledge?.length > 0 && (
              <div>
                <h5 className="font-medium text-green-700 mb-2">Strengths to Acknowledge</h5>
                <div className="space-y-3">
                  {supervisionBrief.strengths_to_acknowledge.map((item) => (
                    <div key={item.strength} className="rounded-md border p-4">
                      <p className="font-medium text-sm">{item.strength}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        <MarkdownText>{item.evidence}</MarkdownText>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        <MarkdownText>{item.why_it_matters}</MarkdownText>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Areas for Growth */}
            {supervisionBrief.areas_for_growth?.length > 0 && (
              <div>
                <h5 className="font-medium text-amber-700 mb-2">Areas for Growth</h5>
                <div className="space-y-3">
                  {supervisionBrief.areas_for_growth.map((item, idx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: read-only server feedback list; composite key disambiguates potential duplicate text
                    <div key={`${idx}-${item.area.slice(0, 40)}`} className="rounded-md border p-4">
                      <p className="font-medium text-sm">{item.area}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        <MarkdownText>{item.what_was_observed}</MarkdownText>
                      </p>
                      {item.suggested_supervision_activity && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Supervision Activity:{" "}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            <MarkdownText>{item.suggested_supervision_activity}</MarkdownText>
                          </span>
                        </div>
                      )}
                      {item.supervision_protocol_section && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Protocol: {item.supervision_protocol_section}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reflective Questions for Supervision */}
            {supervisionBrief.reflective_questions_for_supervision?.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">Reflective Questions for Supervision</h5>
                <ul className="space-y-2">
                  {supervisionBrief.reflective_questions_for_supervision.map((question, idx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: read-only server feedback list; composite key disambiguates potential duplicate text
                    <li key={`${idx}-${question.slice(0, 40)}`} className="flex gap-2 text-sm">
                      <span className="font-semibold text-blue-600 mt-0.5">{idx + 1}.</span>
                      <span className="text-muted-foreground">
                        <MarkdownText>{question}</MarkdownText>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </FeedbackSection>
      )}

      {/* Fellow Wellness Flag — only rendered when flagged */}
      {wellnessFlag?.flagged && (
        <FeedbackSection title="Fellow Wellness Flag">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
            {wellnessFlag.observation && (
              <p className="text-sm">
                <MarkdownText>{wellnessFlag.observation}</MarkdownText>
              </p>
            )}
            {wellnessFlag.suggested_check_in && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <p className="text-xs font-medium text-muted-foreground">Suggested Check-in:</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <MarkdownText>{wellnessFlag.suggested_check_in}</MarkdownText>
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
