import type { QuestionnaireType } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";
import { stringValidation } from "#/lib/utils";

export const QUESTIONNAIRE_TYPE_OPTIONS: [QuestionnaireType, ...QuestionnaireType[]] = [
  "QA",
  "JSS",
];

export const MoveStudentToSchoolSchema = z.object({
  studentId: z.string({ error: "Student is required" }),
  schoolId: z.string({ error: "Please select a school to move the student to" }),
  assignedGroupId: z.string({ error: "Please select a group/fellow for the student" }),
});

export const StudentDetailsSchema = z
  .object({
    id: z.string().optional(),
    mode: z.enum(["add", "edit", "view"]),
    studentName: z.string({ error: "Please enter the student's name" }),
    form: stringValidation("Please enter the student's class").refine(
      (val) => {
        return !Number.isNaN(Number(val)) && val.trim() !== "";
      },
      {
        error: "Please enter a valid value",
      },
    ),
    stream: stringValidation("Please enter the student's stream"),
    gender: stringValidation("Please select the student's gender"),
    questionnaireType: z.union([z.enum(QUESTIONNAIRE_TYPE_OPTIONS), z.literal("none")]).optional(),
    schoolId: z.string().optional(),
    assignedGroupId: z.string().optional(),
    admissionNumber: z.string().optional(),
    yearOfBirth: stringValidation("Please enter year of birth").refine(
      (val) => {
        const year = Number(val);
        const currentYear = new Date().getFullYear();
        const minYear = currentYear - 35;
        const maxYear = currentYear - 9;
        return !Number.isNaN(year) && val.trim() !== "" && year >= minYear && year <= maxYear;
      },
      {
        error: "Student must be between 9 and 35 years old",
      },
    ),
    phoneNumber: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          return isValidPhoneNumber(val, "KE");
        },
        {
          error: "Please enter a valid kenyan phone number",
        },
      ),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "edit" && val.id === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Student Id is required.",
        fatal: true,
        path: ["id"],
      });

      return z.NEVER;
    }

    if (val.mode === "add" && val.admissionNumber === undefined) {
      ctx.addIssue({
        code: "custom",
        message: `Please enter the student's admission number.`,
        fatal: true,
        path: ["admissionNumber"],
      });

      return z.NEVER;
    }

    if (val.mode === "add" && val.schoolId === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "School Id is required.",
        fatal: true,
        path: ["schoolId"],
      });

      return z.NEVER;
    }

    if (val.mode === "add" && val.assignedGroupId === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Group Id is required.",
        fatal: true,
        path: ["assignedGroupId"],
      });

      return z.NEVER;
    }
  });
