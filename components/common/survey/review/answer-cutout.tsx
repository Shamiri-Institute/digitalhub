"use client";

import { Button } from "#/components/ui/button";
import type { AnswerForReview } from "#/lib/survey/answer-review";
import { A4_HEIGHT_PTS, A4_WIDTH_PTS } from "#/lib/utils/pdf/types";

/**
 * The field as it is on paper. A straightened page image is exactly A4, so a layout box in points
 * is the same box on the image: the SVG's viewBox cuts the field out, or shows the whole page with
 * the field outlined. A page that couldn't be straightened is shown whole, as scanned.
 */
export function AnswerCutout({
  image,
  wholePage,
  onToggleWholePage,
}: {
  image: AnswerForReview["image"];
  wholePage: boolean;
  onToggleWholePage: () => void;
}) {
  if (!image) {
    return (
      <p className="rounded-lg bg-muted px-4 py-8 text-center text-sm text-shamiri-text-grey">
        This answer has no scanned page to show.
      </p>
    );
  }
  if (!image.crop) {
    return (
      <figure className="space-y-2">
        <div className="max-h-[70vh] overflow-auto rounded-lg bg-muted p-3">
          {/* oxlint-disable-next-line nextjs/no-img-element -- a short-lived signed link, not an optimisable asset */}
          <img
            src={image.url}
            alt="The scanned page, as scanned"
            className="w-full bg-white shadow-md"
          />
        </div>
        <figcaption className="text-xs text-shamiri-text-grey">
          {image.aligned
            ? "Where this answer sits on the page isn't known, so the whole page is shown."
            : "This page couldn't be straightened, so it is shown whole. Find the question on it."}
        </figcaption>
      </figure>
    );
  }
  const { view, focus } = image.crop;
  const viewBox = wholePage
    ? `0 0 ${A4_WIDTH_PTS} ${A4_HEIGHT_PTS}`
    : `${view.x} ${view.y} ${view.w} ${view.h}`;
  return (
    <figure className="space-y-2">
      <div
        className={
          wholePage
            ? "max-h-[70vh] overflow-auto rounded-lg bg-muted p-3"
            : "rounded-lg bg-muted p-3"
        }
      >
        <svg viewBox={viewBox} className="block w-full bg-white shadow-md">
          <title>
            {wholePage ? "The whole scanned page" : "The answer as written on the page"}
          </title>
          <image
            href={image.url}
            width={A4_WIDTH_PTS}
            height={A4_HEIGHT_PTS}
            preserveAspectRatio="none"
          />
          <rect
            x={focus.x - 2}
            y={focus.y - 2}
            width={focus.w + 4}
            height={focus.h + 4}
            rx={2}
            fill="none"
            className="stroke-shamiri-new-blue"
            strokeWidth={wholePage ? 2 : 1}
            strokeOpacity={0.7}
          />
        </svg>
      </div>
      <figcaption className="flex items-center justify-between gap-2 text-xs text-shamiri-text-grey">
        <span>
          {wholePage ? "The whole page, with this answer outlined." : "As written on the page."}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onToggleWholePage}>
          {wholePage ? "Show the answer" : "Show the whole page"}
        </Button>
      </figcaption>
    </figure>
  );
}
