import { NextResponse } from "next/server";

import { appUrl } from "#/app/api/utils";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    host: appUrl(),
  });
}
