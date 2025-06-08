import { ImplementerRole } from "@prisma/client";

export type Personnel = {
  id: string;
  role: ImplementerRole;
  label: string;
  hub?: string;
  project?: string;
}; 