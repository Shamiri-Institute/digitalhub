import { z } from "zod";

export const SupervisorSchema = z.object({
  supervisorEmail: z.string().email("Invalid email address"),
  supervisorName: z.string().min(1, "Supervisor Name is required").trim(),
  idNumber: z.string().min(1, "ID Number is required").trim(),
  cellNumber: z.string().min(1, "Phone Number is required").trim(),
  mpesaNumber: z.string().min(1, "M-Pesa Number is required").trim(),
  dateOfBirth: z.string().min(1, "Date of Birth is required").trim(),
  gender: z.enum(["Male", "Female"], { required_error: "Gender is required" }),
  county: z.string().min(1, "County is required").trim(),
  subCounty: z.string().min(1, "Sub-County is required").trim(),
  bankName: z.string().min(1, "Bank Name is required").trim(),
  bankBranch: z.string().min(1, "Bank Branch is required").trim(),
});

export type SupervisorType = z.infer<typeof SupervisorSchema>;
