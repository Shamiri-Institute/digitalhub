import type { ImplementerRole } from "#/db/enums";

export type Personnel = {
  id: string;
  role: ImplementerRole;
  label: string;
  hub?: string;
  project?: string;
};
