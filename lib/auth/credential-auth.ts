import { constants } from "#/lib/constants";

// Shared constant - single source of truth for environments that allow credential auth
export const CREDENTIAL_AUTH_ALLOWED_ENVS = ["development", "testing", "training"];

/**
 * Check if credential authentication is allowed in the current environment.
 * Only enabled for development, testing, and training environments.
 * Production always uses Google OAuth only.
 */
export function isCredentialAuthAllowed(): boolean {
  return CREDENTIAL_AUTH_ALLOWED_ENVS.includes(constants.NEXT_PUBLIC_ENV);
}

/**
 * Hardcoded test credentials - ONLY used in non-production environments.
 * All test users share the same password for simplicity.
 *
 * These users must exist in the database (created by seed script).
 * Password validation is done against this map, not the database.
 */
export const TEST_CREDENTIALS: Record<string, string> = {
  // Core development users
  "shadrack.lilan@shamiri.institute": "TestPassword123!",
  "abdulghani.noor@shamiri.institute": "TestPassword123!",
  "wambugu.davis@shamiri.institute": "TestPassword123!",
  "stanley.george@shamiri.institute": "TestPassword123!",
  "benny@shamiri.institute": "TestPassword123!",
  "mmbone@shamiri.institute": "TestPassword123!",
  "kahuria@shamiri.institute": "TestPassword123!",
  "nickson.mugambi@shamiri.institute": "TestPassword123!",
  "okoth@shamiri.institute": "TestPassword123!",
  "marie.odhiambo@shamiri.institute": "TestPassword123!",
  // Static test users from seed script
  "martin.odegaard@test.com": "TestPassword123!",
  "declan.rice@test.com": "TestPassword123!",
  "william.saliba@test.com": "TestPassword123!",
  "bukayo.saka@test.com": "TestPassword123!",
  "gabriel.martinelli@test.com": "TestPassword123!",
  "gabriel.jesus@test.com": "TestPassword123!",
  "mikel.arteta@test.com": "TestPassword123!",
  "edu.gaspar@test.com": "TestPassword123!",
  "ben.white@test.com": "TestPassword123!",
  "kai.havertz@test.com": "TestPassword123!",
  "takehiro.tomiyasu@test.com": "TestPassword123!",
  "admin@shamiri.institute": "TestPassword123!",
};
