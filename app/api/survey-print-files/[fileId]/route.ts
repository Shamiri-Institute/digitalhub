import { requirePrintRunViewer } from "#/lib/auth/survey-access";
import { ForbiddenRoleError, UnauthenticatedError } from "#/lib/auth/require-auth-role";
import { printFileDownloadUrl } from "#/lib/survey/print-files";

/**
 * Downloads a print file. The S3 link it redirects to is made on each click, so a link to this
 * route on an open page never goes stale.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const viewer = await requirePrintRunViewer();
    const url = await printFileDownloadUrl(viewer, (await params).fileId);
    if (!url) {
      return new Response("Not found", { status: 404 });
    }
    return Response.redirect(url, 303);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return new Response("Sign in to download this file", { status: 401 });
    }
    if (error instanceof ForbiddenRoleError) {
      return new Response("You can't download this file", { status: 403 });
    }
    throw error;
  }
}
