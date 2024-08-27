import { NextRequest } from "next/server";
import { Readable } from "stream";

const schoolsCSVHeader = [
  // todo: columns to be added
  "SchoolName",
];

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  try {
    const file = formData.get("file") as File;

    const schoolVisibleId = formData.get("schoolVisibleId") as string;
    const hubId = formData.get("hubId") as string;
    const implementerId = formData.get("implementerId") as string;
    const projectId = formData.get("projectId") as string;

    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const csvStream = Readable.from([fileBuffer]);

    // add code here
  } catch (error) {
    console.error(error);
  }
  //
}
