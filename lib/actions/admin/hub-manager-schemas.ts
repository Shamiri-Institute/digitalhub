import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

import { KENYAN_COUNTIES } from "#/lib/app-constants/constants";
import { GENDER_OPTIONS } from "#/lib/constants";
import { stringValidation } from "#/lib/utils";
import { loginEmail } from "./access-schemas";

const counties = KENYAN_COUNTIES.map((county) => county.name) as [string, ...string[]];

// Left blank in the form, an optional detail is stored as null.
const optionalDetail = z
  .string()
  .trim()
  .max(255, { error: "This is too long" })
  .nullable()
  .transform((value) => value || null);

export const CreateHubManagerSchema = z.object({
  coordinatorName: stringValidation("Please enter the hub manager's name").max(255, {
    error: "The name is too long",
  }),
  coordinatorEmail: loginEmail,
  cellNumber: z
    .string()
    .trim()
    .refine((value) => isValidPhoneNumber(value, "KE"), {
      error: "Please enter a valid Kenyan phone number",
    }),
  idNumber: stringValidation("Please enter the hub manager's ID number").max(255, {
    error: "The ID number is too long",
  }),
  gender: z.enum(GENDER_OPTIONS, { error: "Please pick a gender" }),
  county: z.enum(counties, { error: "Please pick a county" }),
  subCounty: stringValidation("Please pick a sub-county"),
  bankName: optionalDetail,
  bankBranch: optionalDetail,
  bankAccountNumber: optionalDetail,
  bankAccountName: optionalDetail,
  kra: optionalDetail,
});

export const HubManagerRefSchema = z.object({
  hubId: stringValidation("Missing hub ID"),
  hubManagerId: stringValidation("Missing hub manager ID"),
});
