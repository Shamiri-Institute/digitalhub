import { db } from "#/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/payouts/all?day=${params.data.day}&implementerId=${implementer.id}`;
  });

  console.log(implementers);

  const responses = await Promise.all(
    implementerEndpoints.map((endpoint) => {
      return fetch(endpoint, {
        headers: {
          Authorization: authHeader,
        },
      });
    }),
  );

  console.log(responses);
  const data = await Promise.all(
    responses.map((response: Response) => {
      return response.json();
    }),
  );

  console.log(data);
  return NextResponse.json({ data });
}
