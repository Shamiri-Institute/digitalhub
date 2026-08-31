export type SearchableUserRole = "ADMIN" | "HUB_COORDINATOR" | "CLINICAL_LEAD";

export type UserSearchResult = {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  visibleId?: string;
};
