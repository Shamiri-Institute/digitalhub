import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface SessionAnalysisPayload {
  sessionId: string;
  protocolAdherence?: number;
  contentSpecifications?: number;
  contentThoroughness?: number;
  contentSkillfulness?: number;
  contentClarity?: number;
  protocolCompliance?: number;
  strengths?: string;
  weaknesses?: string;
  flags?: string;
  overallSummary?: string;
  analysisDate?: string;
  transcriptionUrl?: string;
  audioUrl?: string;
  analysisVersion?: string;
}

function validateGradingScore(score: number | undefined): boolean {
  if (score === undefined) return true; // Optional field
  return Number.isInteger(score) && score >= 1 && score <= 7;
}

function validatePayload(payload: SessionAnalysisPayload): {
  valid: boolean;
  error?: string;
} {
  // Required field validation
  if (!payload.sessionId) {
    return { valid: false, error: "sessionId is required" };
  }

  // Validate grading scores are within 1-7 range
  const gradingFields = [
    { field: "protocolAdherence", value: payload.protocolAdherence },
    { field: "contentSpecifications", value: payload.contentSpecifications },
    { field: "contentThoroughness", value: payload.contentThoroughness },
    { field: "contentSkillfulness", value: payload.contentSkillfulness },
    { field: "contentClarity", value: payload.contentClarity },
    { field: "protocolCompliance", value: payload.protocolCompliance },
  ];

  for (const { field, value } of gradingFields) {
    if (!validateGradingScore(value)) {
      return {
        valid: false,
        error: `${field} must be an integer between 1 and 7`,
      };
    }
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const payload: SessionAnalysisPayload = await request.json();

    // Validate payload
    const validation = validatePayload(payload);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check if session exists
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

    // Check if analysis already exists for this session
    const existingAnalysis = await db.sessionAnalysis.findFirst({
      where: { sessionId: payload.sessionId },
    });

    if (existingAnalysis) {
      return NextResponse.json(
        { error: "Analysis already exists for this session" },
        { status: 400 },
      );
    }

    // Create session analysis
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
      include: {
        session: {
          select: {
            id: true,
            sessionDate: true,
            school: {
              select: {
                schoolName: true,
              },
            },
          },
        },
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      // Get analysis for specific session
      const analysis = await db.sessionAnalysis.findFirst({
        where: { sessionId },
        include: {
          session: {
            select: {
              id: true,
              sessionDate: true,
              school: {
                select: {
                  schoolName: true,
                },
              },
            },
          },
        },
      });

      if (!analysis) {
        return NextResponse.json(
          { error: "Session analysis not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ data: analysis });
    } else {
      // Get all session analyses
      const analyses = await db.sessionAnalysis.findMany({
        include: {
          session: {
            select: {
              id: true,
              sessionDate: true,
              school: {
                select: {
                  schoolName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ data: analyses });
    }
  } catch (error) {
    console.error("Error fetching session analysis:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
