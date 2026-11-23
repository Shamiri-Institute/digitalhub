import { postPages } from "#/lib/survey/pipeline-api";
import { pipelineRoute } from "#/lib/survey/pipeline-route";

export const POST = pipelineRoute<{ uploadId: string }>((rawBody, { uploadId }) =>
  postPages(uploadId, rawBody),
);
