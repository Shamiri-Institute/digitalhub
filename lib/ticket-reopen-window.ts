// A creator can reopen a resolved ticket for 7 days. Counted in fixed 24-hour days so the server and
// every browser agree whatever their time zone.
export const REOPEN_WINDOW_DAYS = 7;
export const REOPEN_WINDOW_MS = REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function mayReopenTicket(resolvedAt: Date | null, now: Date) {
  return resolvedAt !== null && now.getTime() < resolvedAt.getTime() + REOPEN_WINDOW_MS;
}
