import { ImplementerRole } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

const bankFieldsSchema = z.object({
  bankName: stringValidation("Please enter your bank name"),
  bankBranch: stringValidation("Please enter your bank branch"),
  bankAccountNumber: stringValidation("Please enter your bank account number"),
  bankAccountName: stringValidation("Please enter your bank account name"),
  kra: stringValidation("Please enter your KRA PIN"),
});

const mpesaFieldsSchema = z.object({
  mpesaNumber: z
    .string()
    .min(1, "Please enter your M-pesa number")
    .refine(
      (val) => !val || isValidPhoneNumber(val, "KE"),
      "Invalid Kenyan phone number",
    ),
  mpesaName: z.string().min(1, "Please enter your M-pesa name"),
});

const bankRoles = [
  ImplementerRole.SUPERVISOR,
  ImplementerRole.HUB_COORDINATOR,
  ImplementerRole.CLINICAL_LEAD,
] as const;

export const ProfileSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    idNumber: z.string().min(1, "Please enter your ID number"),
    cellNumber: z
      .string()
      .min(1, "Please enter your phone number")
      .refine(
        (val) => !val || isValidPhoneNumber(val, "KE"),
        "Invalid Kenyan phone number",
      ),
    mpesaNumber: z.string().optional(),
    mpesaName: z.string().optional(),
    dateOfBirth: z.date().optional(),
    gender: z.enum(["Male", "Female", "Other"]),
    county: z.string().min(1, "County is required"),
    subCounty: z.string().min(1, "Sub-county is required"),
    bankName: z.string().optional(),
    bankBranch: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankAccountName: z.string().optional(),
    kra: z.string().optional(),
    role: z.nativeEnum(ImplementerRole),
  })
  .superRefine((data, ctx) => {
    if (data.role === ImplementerRole.FELLOW) {
      const mpesaResult = mpesaFieldsSchema.safeParse(data);
      if (!mpesaResult.success) {
        mpesaResult.error.issues.forEach((issue) => {
          ctx.addIssue(issue);
        });
      }
    }

    if (bankRoles.includes(data.role as (typeof bankRoles)[number])) {
      const bankResult = bankFieldsSchema.safeParse(data);
      if (!bankResult.success) {
        bankResult.error.issues.forEach((issue) => {
          ctx.addIssue(issue);
        });
      }
    }
  });

export type ProfileType = z.infer<typeof ProfileSchema>;
