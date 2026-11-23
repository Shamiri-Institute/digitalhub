import { versionLayout } from "#/lib/survey/pipeline-api";
import { pipelineRoute } from "#/lib/survey/pipeline-route";

export const GET = pipelineRoute<{ versionId: string }>(async (_rawBody, { versionId }) => {
  const layout = await versionLayout(versionId);
  return layout ? { ok: true, body: layout } : { ok: false, refused: "version-not-found" };
});
