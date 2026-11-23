import { scanDownloadLink } from "#/lib/survey/pipeline-api";
import { pipelineRoute } from "#/lib/survey/pipeline-route";

export const POST = pipelineRoute<{ uploadId: string }>((_rawBody, { uploadId }) =>
  scanDownloadLink(uploadId),
);
