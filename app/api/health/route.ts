import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    host: process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL,
  });
}
