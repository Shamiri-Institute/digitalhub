import { db } from "#/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const revalidate = 0;
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const { searchParams } = request.nextUrl;
  const params = z
    .object({
      day: z.enum(["M", "R"]),
    })
    .safeParse({
      day: searchParams.get("day"),
    });

  if (!params.success) {
    console.log(params.error);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const implementers = await db.implementer.findMany();
  const implementerEndpoints = implementers.map((implementer) => {
    const endpoint = `${process.env.NEXT_PUBLIC_APP_URL}/api/payouts/generate?${new URLSearchParams(
      {
        ...Object.fromEntries(searchParams),
        implementerId: implementer.id,
      },
    )}`;
    return endpoint;
  });

  const responses = await Promise.all(
    implementerEndpoints.map((endpoint) => {
      return fetch(endpoint, {
        headers: {
          Authorization: authHeader,
        },
      });
    }),
  );

  const data = await Promise.all(
    responses.map((response: Response) => {
      return response.json();
    }),
  );

  return NextResponse.json({ data });
}
