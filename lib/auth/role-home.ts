import { ImplementerRole } from "@prisma/client";

export const roleHome: Record<ImplementerRole, string> = {
  [ImplementerRole.HUB_COORDINATOR]: "/hc",
  [ImplementerRole.SUPERVISOR]: "/sc",
  [ImplementerRole.FELLOW]: "/fel",
  [ImplementerRole.CLINICAL_LEAD]: "/cl",
  [ImplementerRole.OPERATIONS]: "/ops",
  [ImplementerRole.CLINICAL_TEAM]: "/ct",
  [ImplementerRole.ADMIN]: "/admin",
};
