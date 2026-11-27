import { ImplementerRole } from "#/db/enums";
import { requireSurveyScope } from "#/lib/auth/admin-access";
import {
  ForbiddenRoleError,
  requireAuthRole,
  UnauthenticatedError,
} from "#/lib/auth/require-auth-role";
import { isSurveyExportFile, surveyExportOptionsOf } from "#/lib/survey/export-options";
import { exportSurvey } from "#/lib/survey/survey-export";

// A page on another site could send the admin's browser here and save students' answers to their
// disk under their name in the audit log. A browser marks such a request `cross-site` or
// `same-site`; the export dialog's is `same-origin`, and an address typed in is `none`.
const FOREIGN_FETCH_SITES = new Set(["cross-site", "same-site"]);

// Without it, Excel on Windows reads UTF-8 as its legacy code page and garbles accented names.
const UTF8_BYTE_ORDER_MARK = "\uFEFF";

/** A survey's answers or codebook as CSV, for the Research team only. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ surveyId: string; file: string }> },
) {
  if (FOREIGN_FETCH_SITES.has(request.headers.get("sec-fetch-site") ?? "")) {
    return new Response("Download the file from the survey's page", { status: 403 });
  }
  try {
    await requireAuthRole(ImplementerRole.ADMIN);
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
    return new Response(`${UTF8_BYTE_ORDER_MARK}${exported.csv}`, {
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
