import { getServerSession } from "next-auth";

import { authOptions } from "#/lib/auth-options";
import { getDefaultProjectId } from "#/lib/default-project-id";

export { getDefaultProjectId } from "#/lib/default-project-id";

export async function getActiveProjectId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const projectId = session?.user?.activeProjectId;
  if (projectId) return projectId;
  return getDefaultProjectId();
}
