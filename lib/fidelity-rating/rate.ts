import "server-only";

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { FinishReason, GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

import { retryFailedConnection, type TranscriptSegment } from "#/lib/transcription/transcribe";

// The judge as evaluation-fidelity-monitoring measured it (FINDINGS §29, arm cohort2-v7-real):
// prompts/v7-draft.md byte for byte, gemini-2.5-pro, temperature 0, with a response schema. Change
// any of them only after re-running that eval.
export const RATING_MODEL = "gemini-2.5-pro";
export const RATING_PROMPT_VERSION = "v7";
const PROMPT = readFileSync(
  path.join(process.cwd(), "lib/fidelity-rating/prompts", `${RATING_PROMPT_VERSION}.txt`),
  "utf8",
);
export const RATING_PROMPT_SHA256 = createHash("sha256").update(PROMPT).digest("hex");

// The prompt carries the checklists of these four sessions and no others.
const RATED_SESSIONS: Record<string, string> = {
  s1: "1 of 4 (Growth Mindset)",
  s2: "2 of 4 (Growth Mindset, part 2)",
  s3: "3 of 4 (Gratitude)",
  s4: "4 of 4 (Value Affirmations)",
};

/** The session line the judge reads, or null for a session the prompt has no checklist for. */
export function ratedSessionLine(sessionName: string | null | undefined) {
  return (sessionName && RATED_SESSIONS[sessionName]) ?? null;
}

const mmss = (seconds: number) => {
  const whole = Math.trunc(seconds);
  return `${String(Math.trunc(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
};

/**
 * The report the judge reads, in the eval's report.build() format. Transcripts here carry no
 * speakers, so every line is "SPEAKER" and no lead is named: the eval's unattributed arm, which
 * moved the composite by +0.03 against labelled turns (FINDINGS §16).
 */
export function buildReport(segments: TranscriptSegment[], sessionLine: string) {
  return [
    "# SESSION ANALYSIS REPORT\n",
    "## 1. SESSION METADATA",
    `* **Session:** ${sessionLine}`,
    "* **Identified Lead:** not identified",
    "* **Lead Confidence Score:** None",
    "\n\n---\n\n",
    "## SESSION TRANSCRIPT\n",
    ...segments.flatMap((s) => [
      `### **SPEAKER** \`[${mmss(s.start)} - ${mmss(s.end)}]\``,
      `**TEXT:** "${s.text}"\n`,
    ]),
  ].join("\n");
}

const SCORE = {
  type: Type.OBJECT,
  properties: { score: { type: Type.INTEGER }, justification: { type: Type.STRING } },
  required: ["score", "justification"],
};
const ITEMS = [
  "question_1_protocol_adherence",
  "question_2_content_specifications",
  "question_3_thoroughness",
  "question_4_skillful_delivery",
  "question_5_clarity_accessibility",
  "question_6_protocol_boundaries",
];
// evals/fidelity/analyze.py RESPONSE_SCHEMA, the schema the eval ran with.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fidelity_scores: {
      type: Type.OBJECT,
      properties: {
        ...Object.fromEntries(ITEMS.map((item) => [item, SCORE])),
        overall_score: { type: Type.NUMBER },
        overall_assessment: { type: Type.STRING },
      },
      required: [...ITEMS, "overall_score", "overall_assessment"],
    },
    qualitative_feedback: {
      type: Type.OBJECT,
      properties: {
        session_summary: { type: Type.STRING },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        areas_for_improvement: { type: Type.ARRAY, items: { type: Type.STRING } },
        session_flow_and_engagement: { type: Type.STRING },
      },
      required: ["session_summary", "strengths", "areas_for_improvement"],
    },
    safety_flags: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ["suicidality", "self_harm", "substance_abuse", "other"],
          },
          description: { type: Type.STRING },
          timestamp_reference: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
          immediate_action_needed: { type: Type.BOOLEAN },
          context_analysis: { type: Type.STRING },
          current_vs_past: {
            type: Type.STRING,
            enum: ["current", "past", "educational", "unclear"],
          },
          confidence_level: { type: Type.STRING, enum: ["high", "medium", "low"] },
          requires_follow_up: { type: Type.BOOLEAN },
        },
        required: [
          "type",
          "description",
          "severity",
          "immediate_action_needed",
          "current_vs_past",
          "confidence_level",
          "requires_follow_up",
        ],
      },
    },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["fidelity_scores", "qualitative_feedback"],
};

// Only what the SDH reads back; the rest is stored as the model wrote it. The dialog renders this
// shape as its version 1 (feedback-v1-content.tsx).
const Rating = z.looseObject({
  fidelity_scores: z.looseObject({ overall_score: z.number() }),
  qualitative_feedback: z.looseObject({}),
  safety_flags: z.array(z.unknown()).default([]),
  recommendations: z.array(z.string()).default([]),
});
export type Rating = z.infer<typeof Rating>;

/** Rates one session's transcript; throws when the model gives no usable rating. */
export async function rateTranscript(
  segments: TranscriptSegment[],
  sessionLine: string,
  signal: AbortSignal,
): Promise<Rating> {
  // Credentials as in transcribeAudio. Each attempt times out after 300 s; eval calls took 76 s at
  // most.
  const ai = new GoogleGenAI({ httpOptions: { timeout: 300_000, retryOptions: { attempts: 5 } } });
  const response = await retryFailedConnection(
    () =>
      ai.models.generateContent({
        model: RATING_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT },
              {
                text: `\n\n--- SESSION REPORT START ---\n${buildReport(segments, sessionLine)}\n--- SESSION REPORT END ---`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          maxOutputTokens: 65536,
          temperature: 0,
          abortSignal: signal,
        },
      }),
    signal,
  );
  const finish = response.candidates?.[0]?.finishReason;
  if (!response.candidates?.length || (finish && finish !== FinishReason.STOP)) {
    throw new Error(`Gemini returned no rating (finish reason ${finish ?? "none"})`);
  }
  let json: unknown;
  try {
    json = JSON.parse(response.text ?? "");
  } catch {
    json = undefined;
  }
  const parsed = Rating.safeParse(json);
  // The parse error would quote the model's output, which describes a session with minors.
  if (!parsed.success) throw new Error("Gemini returned a rating that does not match the schema");
  return parsed.data;
}
