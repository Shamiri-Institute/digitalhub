import { z } from "zod";
import { GENDER_OPTIONS } from "#/lib/constants";
import { stringValidation } from "#/lib/utils";

export const FellowSchema = z.object({
  fellowName: stringValidation("Please enter the fellow's name."),
  fellowEmail: stringValidation("Please enter the fellow's email.").pipe(
    z.email("Please enter a valid email address"),
  ),
  cellNumber: stringValidation("Please enter the fellow's cell phone number."),
  mpesaName: stringValidation("Please enter the fellow's MPESA name."),
  mpesaNumber: stringValidation("Please enter the fellow's MPESA number."),
  county: z.string().optional(),
  subCounty: z.string().optional(),
  dateOfBirth: z.coerce.date({ error: "Please enter the fellow's date of birth" }),
  gender: stringValidation("Please enter the fellow's gender."),
  idNumber: z.string().optional(),
});

export type FellowSchema = z.infer<typeof FellowSchema>;

export const SupervisorSchema = z.object({
  supervisorEmail: z.email(),
  supervisorName: z.string().min(1),
  idNumber: z.string().min(1),
  cellNumber: z.string().min(1),
  mpesaNumber: z.string().min(1),
  dateOfBirth: z.string().optional(),
  gender: z.enum(GENDER_OPTIONS),
  county: z.string().min(1),
  subCounty: z.string().min(1),
  bankName: z.string().min(1),
  bankBranch: z.string().min(1),
});

export type SupervisorType = z.infer<typeof SupervisorSchema>;
