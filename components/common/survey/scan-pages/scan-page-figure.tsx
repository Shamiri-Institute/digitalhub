import type { ReactNode } from "react";

import { CopyPageImage } from "#/components/common/survey/copy/copy-page-image";
import { formatDateTimeIn } from "#/lib/date-utils";
import type { UnidentifiedPage } from "#/lib/survey/scan-pages/unidentified";

/** A scanned page ingest couldn't place: its image, large enough to read the code under the QR. */
export function ScanPageFigure({
  page,
  showHub,
  timeZone,
  children,
}: {
  page: UnidentifiedPage;
  showHub: boolean;
  /** Null until the browser has set the viewer's zone. */
  timeZone: string | null;
  /** More facts about the page, under the file's. */
  children?: ReactNode;
}) {
  const facts = [
    `Page ${page.pageIndex + 1} of the file`,
    timeZone && `received ${formatDateTimeIn(page.receivedAt, timeZone)}`,
    showHub && page.hubName,
  ].filter(Boolean);
  return (
    <>
      <div className="rounded-lg bg-muted p-3">
        {page.image ? (
          <a
            href={page.image.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open page ${page.pageIndex + 1} of ${page.fileName} full size`}
            className="block focus-visible:ring-2 focus-visible:ring-shamiri-new-blue focus-visible:outline-none"
          >
            <CopyPageImage
              url={page.image.url}
              alt={`Page ${page.pageIndex + 1} of ${page.fileName}, as scanned`}
              className="max-h-[70vh] w-auto"
            />
          </a>
        ) : (
          <CopyPageImage url={null} alt="" />
        )}
      </div>
      <div className="space-y-0.5 text-sm">
        <p className="font-medium break-words text-shamiri-black">{page.fileName}</p>
        <p className="text-shamiri-text-grey">{facts.join(" · ")}</p>
        {children}
      </div>
    </>
  );
}
