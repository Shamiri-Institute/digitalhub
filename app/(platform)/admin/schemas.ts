import { z } from "zod";
import { stringValidation } from "#/lib/utils";

export const AdminSchema = z.object({
  id: stringValidation("Missing admin ID"),
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name is required"),
  role: z.literal("admin"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateHubSchema = z.object({
  name: z.string().min(1, "Hub name is required"),
  location: z.string().min(1, "Location is required"),
  coordinatorId: stringValidation("Missing coordinator ID"),
});

export const AssignUserToHubSchema = z.object({
  userId: stringValidation("Missing user ID"),
  hubId: stringValidation("Missing hub ID"),
  role: z.enum(["hub_coordinator", "supervisor", "fellow", "clinical_lead"]),
});

export const SystemSettingsSchema = z.object({
  allowNewRegistrations: z.boolean(),
  maintenanceMode: z.boolean(),
  defaultHubCapacity: z.number().min(1),
  maxFellowsPerHub: z.number().min(1),
  maxSupervisorsPerHub: z.number().min(1),
});

export type AdminType = z.infer<typeof AdminSchema>;
export type CreateHubType = z.infer<typeof CreateHubSchema>;
export type AssignUserToHubType = z.infer<typeof AssignUserToHubSchema>;
export type SystemSettingsType = z.infer<typeof SystemSettingsSchema>;