import { stringValidation } from "#/lib/utils";
import { z } from "zod";

export const FellowSchema = z.object({
  fellowName: stringValidation("Please enter the fellow's name."),
  fellowEmail: stringValidation("Please enter the fellow's email.").email(
    "Please enter a valid email address",
  ),
  cellNumber: stringValidation("Please enter the fellow's cell phone number."),
  mpesaName: stringValidation("Please enter the fellow's MPESA name."),
  mpesaNumber: stringValidation("Please enter the fellow's MPESA number."),
  county: z.string().optional(),
  subCounty: z.string().optional(),
  dateOfBirth: z.coerce.date({
    required_error: "Please enter the fellow's date of birth",
  }),
  gender: stringValidation("Please enter the fellow's gender."),
  idNumber: z.string().optional(),
});

export type FellowSchema = z.infer<typeof FellowSchema>;
