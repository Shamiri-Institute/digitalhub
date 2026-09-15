import { appendToPdf, imagesToPdf } from "#/lib/utils/pdf/images-to-pdf";

export async function createAttendancePdf(fileUrl: string | null, files: File[]): Promise<File> {
  let pdfBlob: Blob;
  if (fileUrl) {
    const res = await fetch(fileUrl);
    if (!res.ok) {
      pdfBlob = await imagesToPdf(files);
    } else {
      pdfBlob = await appendToPdf(await res.arrayBuffer(), files);
    }
  } else {
    pdfBlob = await imagesToPdf(files);
  }
  const pdfFile = new File([pdfBlob], "attendance.pdf", {
    type: "application/pdf",
  });

  return pdfFile;
}
