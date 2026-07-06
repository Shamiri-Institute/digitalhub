import { AdaptationType, SupportType } from "@prisma/client";

export type ScaleOption = { value: number; label: string };

export const FREQUENCY_OPTIONS: ScaleOption[] = [
  { value: 1, label: "Rarely" },
  { value: 2, label: "Sometimes" },
  { value: 3, label: "Often" },
  { value: 4, label: "Almost always" },
  { value: 5, label: "Always" },
];

export const TRANSFER_OPTIONS: ScaleOption[] = [
  { value: 1, label: "Never" },
  { value: 2, label: "Rarely" },
  { value: 3, label: "Sometimes" },
  { value: 4, label: "Frequently" },
];

export const RELATIONSHIP_OPTIONS: ScaleOption[] = [
  { value: 1, label: "Very difficult — consistent struggle to connect" },
  {
    value: 2,
    label: "Challenging — some connection but significant difficulties throughout",
  },
  {
    value: 3,
    label: "Adequate — a reasonable working relationship, with some distance",
  },
  {
    value: 4,
    label: "Good — students felt comfortable with me most of the time",
  },
  {
    value: 5,
    label: "Strong — consistent rapport and trust throughout the cycle",
  },
];

export const CONFIDENCE_OPTIONS: ScaleOption[] = [
  {
    value: 1,
    label: "Very low — frequently felt underprepared or out of my depth",
  },
  {
    value: 2,
    label: "Low — confidence was inconsistent, many sessions felt difficult",
  },
  {
    value: 3,
    label: "Moderate — generally confident, with some challenging moments",
  },
  { value: 4, label: "High — felt prepared and in control most of the time" },
  {
    value: 5,
    label: "Very high — consistently confident throughout the cycle",
  },
];

export const CHALLENGE_IMPACT_OPTIONS: ScaleOption[] = [
  { value: 1, label: "Not at all" },
  { value: 2, label: "Slightly" },
  { value: 3, label: "Moderately" },
  { value: 4, label: "Significantly" },
  { value: 5, label: "Severely" },
];

export const ADAPTATION_TYPE_OPTIONS: {
  value: AdaptationType;
  label: string;
}[] = [
  { value: AdaptationType.CONTENT, label: "Content" },
  { value: AdaptationType.PACING, label: "Pacing" },
  { value: AdaptationType.LANGUAGE, label: "Language" },
  { value: AdaptationType.FORMAT, label: "Format" },
  { value: AdaptationType.OTHER, label: "Other" },
];

export const SUPPORT_TYPE_OPTIONS: { value: SupportType; label: string }[] = [
  {
    value: SupportType.TRAINING,
    label: "More training on a specific facilitation skill",
  },
  { value: SupportType.CHECK_INS, label: "More frequent supervisor check-ins" },
  { value: SupportType.MATERIALS, label: "Better session materials" },
  { value: SupportType.PEER_SUPPORT, label: "Peer Fellow support" },
  { value: SupportType.SUFFICIENT, label: "I had sufficient support" },
  { value: SupportType.OTHER, label: "Other" },
];

export const SECTION_TITLES = [
  "Fidelity",
  "Adaptations",
  "Student Engagement",
  "Group Climate",
  "Skill Uptake and Transfer",
  "Fellow-Group Relationship",
  "Implementation Context",
  "Fellow Experience and Reflection",
  "Supervision and Support",
] as const;

export const MAX_REPORT_TEXT = 500;

export function labelFor(
  options: { value: number | string; label: string }[],
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return options.find((option) => option.value === value)?.label ?? String(value);
}
