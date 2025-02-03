import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  // Retrieve the current supervisor (authenticated user)

  const supervisor = await currentSupervisor();
  if (!supervisor || !supervisor.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    idNumber,
    cellNumber,
    mpesaNumber,
    dateOfBirth,
    gender,
    county,
    subCounty,
    bankName,
    bankBranch,
  } = body;

  try {
    const updatedProfile = await db.supervisor.update({
      where: { id: supervisor.id },
      data: {
        idNumber,
        cellNumber,
        mpesaNumber,
        dateOfBirth,
        gender,
        county,
        subCounty,
        bankName,
        bankBranch,
      },
    });

    return NextResponse.json(updatedProfile, { status: 200 });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
