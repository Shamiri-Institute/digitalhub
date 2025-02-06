import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";


const updateProfileSchema = z.object({
  idNumber: z.string().min(1, "ID Number is required").trim(),
  cellNumber: z.string().min(1, "Phone Number is required").trim(),
  mpesaNumber: z.string().min(1, "M-Pesa Number is required").trim(),
  dateOfBirth: z.string().min(1, "Date of Birth is required").trim(),
  gender: z.enum(["Male", "Female"]),
  county: z.string().min(1, "County is required").trim(),
  subCounty: z.string().min(1, "Sub-County is required").trim(),
  bankName: z.string().min(1, "Bank Name is required").trim(),
  bankBranch: z.string().min(1, "Bank Branch is required").trim(),
});

export async function PUT(request: Request) {
  const supervisor = await currentSupervisor();
  
  if (!supervisor || !supervisor.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    const updatedProfile = await db.supervisor.update({
      where: { id: supervisor.id },
      data: validatedData,
    });

    return NextResponse.json(updatedProfile, { status: 200 });
  } catch (error) {
    console.error("Error updating profile:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation Error", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
