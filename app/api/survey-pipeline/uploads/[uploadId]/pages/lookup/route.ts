import { lookUpPageCodes } from "#/lib/survey/pipeline-api";
import { pipelineRoute } from "#/lib/survey/pipeline-route";

export const POST = pipelineRoute<{ uploadId: string }>((rawBody, { uploadId }) =>
  lookUpPageCodes(uploadId, rawBody),
);
