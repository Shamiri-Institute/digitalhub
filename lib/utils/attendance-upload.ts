import { appendToPdf, imagesToPdf } from "#/lib/utils/pdf/images-to-pdf";

const RETRYABLE_STATUSES = new Set([408, 429]);

async function fetchExistingDocument(url: string, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok || (res.status < 500 && !RETRYABLE_STATUSES.has(res.status))) {
        return res;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Could not load the existing attendance document");
}

export async function createAttendancePdf(fileUrl: string | null, files: File[]): Promise<File> {
  let pdfBlob: Blob;
  if (fileUrl) {
    const res = await fetchExistingDocument(fileUrl);
    if (!res.ok) {
      throw new Error(`Could not load the existing attendance document (${res.status})`);
    }
    pdfBlob = await appendToPdf(await res.arrayBuffer(), files);
  } else {
    pdfBlob = await imagesToPdf(files);
  }
  const pdfFile = new File([pdfBlob], "attendance.pdf", {
    type: "application/pdf",
  });

  return pdfFile;
}
