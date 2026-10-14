import { Badge, type BadgeProps } from "#/components/ui/badge";
import {
  SURVEY_STATUS_LABELS,
  SURVEY_VERSION_STATUS_LABELS,
  type SurveyStatus,
  type SurveyVersionStatus,
} from "#/db/enums";

const SURVEY_STATUS_VARIANT: Record<SurveyStatus, BadgeProps["variant"]> = {
  DRAFT: "outline-solid",
  ACTIVE: "shamiri-green",
  CLOSED: "secondary",
};

const VERSION_STATUS_VARIANT: Record<SurveyVersionStatus, BadgeProps["variant"]> = {
  DRAFT: "outline-solid",
  PUBLISHED: "shamiri-green",
  RETIRED: "secondary",
};

export function SurveyStatusBadge({ status }: { status: SurveyStatus }) {
  return <Badge variant={SURVEY_STATUS_VARIANT[status]}>{SURVEY_STATUS_LABELS[status]}</Badge>;
}

export function SurveyVersionStatusBadge({ status }: { status: SurveyVersionStatus }) {
  return (
    <Badge variant={VERSION_STATUS_VARIANT[status]}>{SURVEY_VERSION_STATUS_LABELS[status]}</Badge>
  );
}
