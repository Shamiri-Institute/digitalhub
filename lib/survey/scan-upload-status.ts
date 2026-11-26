import { SurveyUploadStatus } from "#/db/enums";

/** Stuck ones included: a stuck job may still recover, and the page should show it when it does. */
export function isUploadUnfinished(status: SurveyUploadStatus) {
  return (
    status === SurveyUploadStatus.UPLOADED ||
    status === SurveyUploadStatus.QUEUED ||
    status === SurveyUploadStatus.PROCESSING
  );
}

export function mayRunAgain(upload: { status: SurveyUploadStatus; stuck: boolean }) {
  return upload.status === SurveyUploadStatus.FAILED || upload.stuck;
}
