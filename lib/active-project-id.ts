import { cookies } from "next/headers";
import { ACTIVE_PROJECT_ID_COOKIE, CURRENT_PROJECT_ID } from "#/lib/constants";

export async function getActiveProjectId(): Promise<string> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ACTIVE_PROJECT_ID_COOKIE)?.value;
  return value ?? CURRENT_PROJECT_ID;
}
