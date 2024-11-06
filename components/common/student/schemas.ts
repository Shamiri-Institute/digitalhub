import { stringValidation } from "#/lib/utils";
import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

export const StudentDetailsSchema = z
  .object({
    id: z.string().optional(),
    mode: z.enum(["add", "edit"]),
    studentName: z.string({
      required_error: "Please enter the student's name",
    }),
    form: z.coerce.number({
      required_error: "Please enter the student's class",
      invalid_type_error: "Please enter the student's class",
    }),
    stream: stringValidation("Please enter the student's stream"),
    gender: stringValidation("Please select the student's gender"),
    schoolVisibleId: z.string().optional(),
    assignedGroupId: z.string().optional(),
    admissionNumber: z.string().optional(),
    yearOfBirth: z.coerce.number({
      required_error: "Please enter year of birth",
      invalid_type_error: "Please enter year of birth",
    }),
    phoneNumber: stringValidation("Please enter the student's contact").refine(
      (val) => isValidPhoneNumber(val, "KE"),
      {
        message: "Please enter a valid kenyan phone number",
      },
    ),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "edit" && val.id === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Student Id is required.`,
        fatal: true,
        path: ["id"],
      });

      return z.NEVER;
    }

    if (val.mode === "add" && val.admissionNumber === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Please enter the student's admission number.`,
        fatal: true,
        path: ["admissionNumber"],
      });

      return z.NEVER;
    }

    if (val.mode === "add" && val.schoolVisibleId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `School Id is required.`,
        fatal: true,
        path: ["schoolId"],
      });

      return z.NEVER;
    }

    if (val.mode === "add" && val.assignedGroupId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Group Id is required.`,
        fatal: true,
        path: ["assignedGroupId"],
      });

      return z.NEVER;
    }
  });
