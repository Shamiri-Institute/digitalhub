import * as z from "zod";
import { stringValidation } from "./utils";

export const EditFellowSchema = z.object({
  id: z.string(),
  fellowName: z
    .string({
      error: "Please enter a name",
    })
    .trim()
    .min(1, { message: "Please enter a name" }),
  dateOfBirth: z.date(),
  gender: z.string(),
  fellowEmail: stringValidation("Please provide fellow email").email(),
  idNumber: stringValidation("Please input the fellow's ID"),
  cellNumber: z
    .string({
      error: "Please enter a valid phone number",
    })
    .trim()
    .min(1, { message: "Please enter a valid phone number" }), // validate w/ libphonenumberjs
  mpesaName: z
    .string({
      error: "Please enter a name",
    })
    .trim()
    .min(1, { message: "Please enter a name" }),
  mpesaNumber: z
    .string({
      error: "please enter a valid phone number",
    })
    .trim()
    .min(1, { message: "Please enter a valid phone number" }), // validate w/ libphonenumberjs
  county: z
    .string({
      error: "County is required",
    })
    .trim()
    .min(1, { message: "Please enter a valid county" }),
  subCounty: z
    .string({
      error: "Sub county is required",
    })
    .trim()
    .min(1, { message: "Please enter a valid sub county" }),
});
