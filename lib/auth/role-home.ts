import { ImplementerRole } from "#/db/enums";

// Operations staff are admins on the Operations team; the role has no home of its own.
export const roleHome: Partial<Record<ImplementerRole, string>> = {
  [ImplementerRole.HUB_COORDINATOR]: "/hc",
  [ImplementerRole.SUPERVISOR]: "/sc",
  [ImplementerRole.FELLOW]: "/fel",
  [ImplementerRole.CLINICAL_LEAD]: "/cl",
  [ImplementerRole.CLINICAL_TEAM]: "/ct",
  [ImplementerRole.ADMIN]: "/admin",
};
