/**
 * Mirrors horizontal scroll between the split sticky-header and body
 * scrollers so the calendar columns stay aligned.
 */
export function syncScrollLeft(source: HTMLDivElement, target: HTMLDivElement | null) {
  if (target && target.scrollLeft !== source.scrollLeft) {
    target.scrollLeft = source.scrollLeft;
  }
}
