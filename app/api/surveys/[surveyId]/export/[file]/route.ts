import { requireSurveyScope } from "#/lib/auth/admin-access";
import { ForbiddenRoleError, UnauthenticatedError } from "#/lib/auth/require-auth-role";
import { isSurveyExportFile, surveyExportOptionsOf } from "#/lib/survey/export-options";
import { exportSurvey } from "#/lib/survey/survey-export";

/** A survey's answers or codebook as CSV, for the Research team only. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ surveyId: string; file: string }> },
) {
  try {
    const scope = await requireSurveyScope();
    const { surveyId, file } = await params;
    if (!isSurveyExportFile(file)) {
      return new Response("Not found", { status: 404 });
    }
    const options = surveyExportOptionsOf(new URL(request.url).searchParams);
    if (!options) {
      return new Response("Choose the versions, cell values and copies to export", { status: 400 });
    }
    const exported = await exportSurvey(scope, surveyId, file, options);
    if (!exported) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(exported.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exported.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return new Response("Sign in to download this file", { status: 401 });
    }
    if (error instanceof ForbiddenRoleError) {
      return new Response("Only the Research team can export survey answers", { status: 403 });
    }
    throw error;
  }
}
