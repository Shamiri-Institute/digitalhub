import { Badge } from "#/components/ui/badge";
import { SURVEY_QUESTIONNAIRE_STATUS_LABELS, SurveyQuestionnaireStatus } from "#/db/enums";

export function QuestionnaireStatusBadge({ status }: { status: SurveyQuestionnaireStatus }) {
  return (
    <Badge
      variant={
        status === SurveyQuestionnaireStatus.VOID
          ? "destructive"
          : status === SurveyQuestionnaireStatus.VERIFIED
            ? "shamiri-green"
            : "outline-solid"
      }
    >
      {SURVEY_QUESTIONNAIRE_STATUS_LABELS[status]}
    </Badge>
  );
}
