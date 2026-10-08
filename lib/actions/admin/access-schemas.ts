import { z } from "zod";

import { AdminTeam, enumValues } from "#/db/enums";
import { stringValidation } from "#/lib/utils";

const accessFields = {
  team: z.enum(enumValues(AdminTeam), { error: "Please pick a valid team" }).nullable(),
  isSuperAdmin: z.boolean(),
};

export const CreateAdminSchema = z.object({
  adminName: stringValidation("Please enter the admin's name"),
  email: z.email({ error: "Please enter a valid email." }),
  ...accessFields,
});

export const UpdateAdminAccessSchema = z.object({
  adminId: stringValidation("Missing admin ID"),
  ...accessFields,
});
