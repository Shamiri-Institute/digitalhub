import "server-only";

import type { PipelineResult } from "#/lib/survey/pipeline-api";
import { verifiedPipelineBody } from "#/lib/survey/pipeline-signing";

/**
 * A route handler for the extraction pipeline: it refuses a request the pipeline didn't sign with
 * 401 before anything else, and answers a refusal with its status and reason.
 */
export function pipelineRoute<Params>(
  handle: (rawBody: string, params: Params) => Promise<PipelineResult<unknown>>,
) {
  return async (request: Request, { params }: { params: Promise<Params> }) => {
    const rawBody = await verifiedPipelineBody(request);
    if (rawBody === undefined) {
      return new Response(null, { status: 401 });
    }
    const result = await handle(rawBody, await params);
    if (result.ok) {
      return Response.json(result.body);
    }
    switch (result.refused) {
      case "upload-not-found":
        return Response.json({ error: "upload-not-found" }, { status: 404 });
      case "version-not-found":
        return Response.json({ error: "version-not-found" }, { status: 404 });
      case "stale-attempt":
        return Response.json(
          { error: "stale-attempt", currentAttempt: result.currentAttempt },
          { status: 409 },
        );
      case "upload-not-running":
        return Response.json(
          { error: "upload-not-running", status: result.status },
          { status: 409 },
        );
      case "invalid":
        return Response.json({ error: "invalid", reason: result.reason }, { status: 400 });
    }
  };
}
