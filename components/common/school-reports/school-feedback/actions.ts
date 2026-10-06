"use server";

import { and, eq, inArray } from "drizzle-orm";

import type { SchoolFeedbackFormValues } from "#/components/common/school-reports/school-feedback/view-edit-school-feedback";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { school, schoolFeedback } from "#/db/schema";
import { requireHubRole } from "#/lib/auth/require-hub-role";

/**
 * Updates a school feedback. A supervisor may edit the feedback they wrote; a hub coordinator may
 * edit any feedback on a school in their hub. Other feedback reads as missing.
 */
export async function editSchoolFeedback(feedbackId: string, data: SchoolFeedbackFormValues) {
  try {
    const caller = await requireHubRole(
      ImplementerRole.SUPERVISOR,
      ImplementerRole.HUB_COORDINATOR,
    );
    const feedbackInCallerScope =
      caller.role === ImplementerRole.HUB_COORDINATOR
        ? inArray(
            schoolFeedback.schoolId,
            db.select({ id: school.id }).from(school).where(eq(school.hubId, caller.hubId)),
          )
        : eq(schoolFeedback.userId, caller.userId);

    const updated = await db
      .update(schoolFeedback)
      // Only the answers are editable; the school and the author stay as recorded.
      .set({
        studentTeacherSatisfactionRating: data.studentTeacherSatisfactionRating,
        factorsInfluencedStudentParticipation: data.factorsInfluencedStudentParticipation,
        concernsRaisedByTeachers: data.concernsRaisedByTeachers,
        programImpactOnStudents: data.programImpactOnStudents,
      })
      .where(and(eq(schoolFeedback.id, feedbackId), feedbackInCallerScope))
      .returning({ id: schoolFeedback.id });
    if (updated.length === 0) {
      throw new Error(`School feedback ${feedbackId} not found`);
    }

    return {
      success: true,
      message: "School feedback updated successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      message: "Something went wrong",
      success: false,
    };
  }
}
