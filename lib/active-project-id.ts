import { getCachedSession } from "#/lib/auth";
import { getDefaultProjectId } from "#/lib/default-project-id";

export async function getActiveProjectId(): Promise<string> {
  const session = await getCachedSession();
  const projectId = session?.user?.activeProjectId;
  if (projectId) return projectId;
  return getDefaultProjectId();
}
