// Stopgap for bulk uploads until transcription runs from a queue: every finished recording upload
// starts a transcription in the same server invocation chain. The count lives in this module, so
// it caps one browser tab, not a supervisor or the server.
export const MAX_CONCURRENT_UPLOADS = 2;

let uploadsInFlight = 0;

export function tryAcquireUploadSlot(): boolean {
  if (uploadsInFlight >= MAX_CONCURRENT_UPLOADS) return false;
  uploadsInFlight++;
  return true;
}

export function releaseUploadSlot() {
  uploadsInFlight = Math.max(0, uploadsInFlight - 1);
}
