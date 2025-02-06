import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supervisor = await currentSupervisor();

  if (!supervisor || !supervisor.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await db.supervisor.findUnique({
      where: { id: supervisor.id },
      select: {
        supervisorEmail: true,
        supervisorName: true,
        idNumber: true,
        cellNumber: true,
        mpesaNumber: true,
        dateOfBirth: true,
        gender: true,
        county: true,
        subCounty: true,
        bankName: true,
        bankBranch: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { message: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
