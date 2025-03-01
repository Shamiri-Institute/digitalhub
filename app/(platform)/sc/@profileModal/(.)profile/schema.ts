import { z } from "zod";

export const SupervisorSchema = z.object({
  supervisorEmail: z.string().email(),
  supervisorName: z.string().min(1),
  idNumber: z.string().min(1),
  cellNumber: z.string().min(1),
  mpesaNumber: z.string().min(1),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female"]),
  county: z.string().min(1),
  subCounty: z.string().min(1),
  bankName: z.string().min(1),
  bankBranch: z.string().min(1),
});

export type SupervisorType = z.infer<typeof SupervisorSchema>;
