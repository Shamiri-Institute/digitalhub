import * as z from "zod";
import { stringValidation } from "./utils";

export const EditFellowSchema = z.object({
  id: z.string(),
  fellowName: z
    .string({
      required_error: "Please enter a name",
      invalid_type_error: "Please enter a name",
    })
    .trim()
    .min(1, { message: "Please enter a name" }),
  dateOfBirth: z.date(),
  gender: z.string(),
  fellowEmail: stringValidation("Please provide fellow email").email(),
  idNumber: stringValidation("Please input the fellow's ID"),
  cellNumber: z
    .string({
      required_error: "Please enter a valid phone number",
      invalid_type_error: "Please enter a valid phone number",
    })
    .trim()
    .min(1, { message: "Please enter a valid phone number" }), // validate w/ libphonenumberjs
  mpesaName: z
    .string({
      required_error: "Please enter a name",
      invalid_type_error: "Please enter a name",
    })
    .trim()
    .min(1, { message: "Please enter a name" }),
  mpesaNumber: z
    .string({
      required_error: "please enter a valid phone number",
      invalid_type_error: "Please enter a valid phone number",
    })
    .trim()
    .min(1, { message: "Please enter a valid phone number" }), // validate w/ libphonenumberjs
  county: z
    .string({
      required_error: "County is required",
      invalid_type_error: "Please enter a valid county name",
    })
    .trim()
    .min(1, { message: "Please enter a valid county" }),
  subCounty: z
    .string({
      required_error: "Sub county is required",
      invalid_type_error: "Please enter a valid sub county name",
    })
    .trim()
    .min(1, { message: "Please enter a valid sub county" }),
});
