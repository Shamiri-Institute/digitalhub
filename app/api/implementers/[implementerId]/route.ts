import { type NextRequest, NextResponse } from "next/server";

import { db } from "#/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  props: {
    params: Promise<{
      implementerId: string;
    }>;
  },
) {
  const params = await props.params;
  try {
    const implementer = await db.implementer.findUniqueOrThrow({
      where: { id: params.implementerId },
      include: {
        avatar: {
          include: {
            file: true,
          },
        },
      },
    });

    return NextResponse.json(implementer);
  } catch {
    return NextResponse.json({
      status: 404,
      error: "Implementer not found.",
    });
  }
}
