import { ImplementerRole } from "#/db/enums";

// Operations staff are admins on the Operations team; no membership holds the role until it is dropped.
export const roleHome: Record<ImplementerRole, string> = {
  [ImplementerRole.HUB_COORDINATOR]: "/hc",
  [ImplementerRole.SUPERVISOR]: "/sc",
  [ImplementerRole.FELLOW]: "/fel",
  [ImplementerRole.CLINICAL_LEAD]: "/cl",
  [ImplementerRole.CLINICAL_TEAM]: "/ct",
  [ImplementerRole.ADMIN]: "/admin",
  [ImplementerRole.OPERATIONS]: "/admin",
};
