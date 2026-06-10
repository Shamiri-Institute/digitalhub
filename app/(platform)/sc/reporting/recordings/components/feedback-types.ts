// Shared

export interface SafetyFlag {
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

// V1

export interface V1QuestionScore {
  score: number;
  justification: string;
}

export interface V1FidelityScores {
  overall_score: string;
  overall_assessment: string;
  [key: string]: string | V1QuestionScore | unknown;
}

export interface V1QualitativeFeedback {
  strengths?: string[];
  session_summary?: string;
  areas_for_improvement?: string[];
  session_flow_and_engagement?: string;
}

export interface V1FeedbackData {
  safety_flags: SafetyFlag[];
  fidelity_scores: V1FidelityScores;
  recommendations: string[];
  qualitative_feedback: V1QualitativeFeedback;
}

// V2

export interface V2SessionParticipation {
  estimated_speakers: string;
  lead_fellow_speaking_time: string;
  lead_fellow_speaking_percentage: string;
  total_student_speaking_time: string;
  participation_distribution: string;
  prosodic_observations: string;
}

export interface V2QuestionScore {
  score: string;
  justification: string;
  open_closed_question_ratio?: string;
}

export interface V2FidelityScores {
  overall_fidelity_score: string;
  overall_fidelity_summary: string;
  [key: string]: string | V2QuestionScore | unknown;
}

export interface V2CompetencyItem {
  observed_behaviours: string;
  estimated_level: string;
  level_framing: string;
  confidence: string;
  confidence_note: string;
}

export interface V2RedFlagCheck {
  any_critical_L1: boolean;
  flagged_domains: string[];
  recommendation: string | null;
}

export interface V2CompetencyProfile {
  red_flag_check: V2RedFlagCheck;
  [key: string]: V2CompetencyItem | V2RedFlagCheck | unknown;
}

export interface V2StrengthItem {
  strength: string;
  evidence: string;
  why_it_matters: string;
}

export interface V2GrowthAreaItem {
  area: string;
  what_was_observed: string;
  why_it_matters: string;
  suggested_supervision_activity: string;
  supervision_protocol_section: string;
}

export interface V2FellowWellnessFlag {
  flagged: boolean;
  observation: string | null;
  suggested_check_in: string | null;
}

export interface V2SupervisionBrief {
  strengths_to_acknowledge: V2StrengthItem[];
  areas_for_growth: V2GrowthAreaItem[];
  fellow_wellness_flag: V2FellowWellnessFlag;
  reflective_questions_for_supervision: string[];
}

export interface V2FeedbackData {
  session_participation: V2SessionParticipation;
  fidelity_scores: V2FidelityScores;
  competency_profile: V2CompetencyProfile;
  supervision_preparation_brief: V2SupervisionBrief;
  safety_flags: SafetyFlag[];
}
