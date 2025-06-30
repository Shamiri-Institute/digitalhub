import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { stringValidation } from "#/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SessionAnalysisSchema = z.object({
  sessionId: stringValidation("Session ID is required"),
  protocolAdherence: z
    .number({
      invalid_type_error: "Protocol adherence must be a number",
    })
    .int("Protocol adherence must be an integer")
    .min(1)
    .max(7),

  contentSpecifications: z
    .number({
      invalid_type_error: "Content specifications must be a number",
    })
    .int("Content specifications must be an integer")
    .min(1)
    .max(7),
  contentThoroughness: z
    .number({
      invalid_type_error: "Content thoroughness must be a number",
    })
    .int("Content thoroughness must be an integer")
    .min(1)
    .max(7),
  contentSkillfulness: z
    .number({
      invalid_type_error: "Content skillfulness must be a number",
    })
    .int("Content skillfulness must be an integer")
    .min(1)
    .max(7),
  contentClarity: z
    .number({
      invalid_type_error: "Content clarity must be a number",
    })
    .int("Content clarity must be an integer")
    .min(1)
    .max(7),
  protocolCompliance: z
    .number({
      invalid_type_error: "Protocol compliance must be a number",
    })
    .int("Protocol compliance must be an integer")
    .min(1)
    .max(7),
  strengths: z.string(),
  weaknesses: z.string(),
  flags: z.string().optional(),
  overallSummary: z.string(),
  analysisDate: z
    .string()
    .datetime("Analysis date must be a valid ISO date string")
    .optional(),
  transcriptionUrl: z
    .string()
    .url("Transcription URL must be a valid URL")
    .optional(),
  audioUrl: z.string().url("Audio URL must be a valid URL").optional(),
  analysisVersion: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate payload with Zod
    const result = SessionAnalysisSchema.safeParse(body);
    if (!result.success) {
      const errorMessages = result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errorMessages,
        },
        { status: 400 },
      );
    }

    const payload = result.data;

    const existingSession = await db.interventionSession.findUnique({
      where: { id: payload.sessionId },
      select: {
        id: true,
        sessionDate: true,
        school: { select: { schoolName: true } },
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const existingAnalysis = await db.sessionAnalysis.findFirst({
      where: { sessionId: payload.sessionId },
    });

    if (existingAnalysis) {
      return NextResponse.json(
        { error: "Analysis already exists for this session" },
        { status: 400 },
      );
    }

    const sessionAnalysis = await db.sessionAnalysis.create({
      data: {
        id: objectId("session_analysis"),
        sessionId: payload.sessionId,
        protocolAdherence: payload.protocolAdherence,
        contentSpecifications: payload.contentSpecifications,
        contentThoroughness: payload.contentThoroughness,
        contentSkillfulness: payload.contentSkillfulness,
        contentClarity: payload.contentClarity,
        protocolCompliance: payload.protocolCompliance,
        strengths: payload.strengths,
        weaknesses: payload.weaknesses,
        flags: payload.flags,
        overallSummary: payload.overallSummary,
        analysisDate: payload.analysisDate
          ? new Date(payload.analysisDate)
          : new Date(),
        transcriptionUrl: payload.transcriptionUrl,
        audioUrl: payload.audioUrl,
        analysisVersion: payload.analysisVersion,
      },
    });

    return NextResponse.json(
      {
        message: "Session analysis created successfully",
        data: sessionAnalysis,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating session analysis:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
