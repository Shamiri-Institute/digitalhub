import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error("No URL found");
  }
  const host = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return NextResponse.json({
    status: "ok",
    host,
  });
}
