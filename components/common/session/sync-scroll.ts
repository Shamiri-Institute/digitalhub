export function syncScrollLeft(source: HTMLDivElement, target: HTMLDivElement | null) {
  if (target && target.scrollLeft !== source.scrollLeft) {
    target.scrollLeft = source.scrollLeft;
  }
}
