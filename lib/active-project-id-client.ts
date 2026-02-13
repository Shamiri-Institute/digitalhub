import { ACTIVE_PROJECT_ID_COOKIE } from "#/lib/constants";

const COOKIE_MAX_AGE_DAYS = 365;

export function setActiveProjectIdAndReload(projectId: string): void {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${ACTIVE_PROJECT_ID_COOKIE}=${encodeURIComponent(projectId)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  window.location.reload();
}
