import { CREDENTIAL_AUTH_ALLOWED_ENVS } from "#/lib/auth/client-credential-auth";
import { constants } from "#/lib/constants";

export function isCredentialAuthAllowed() {
  return (
    CREDENTIAL_AUTH_ALLOWED_ENVS.includes(constants.NEXT_PUBLIC_ENV) &&
    !!process.env.TEST_USER_PASSWORD
  );
}

export const TEST_USER_EMAILS: ReadonlySet<string> = new Set([
  // Core development users
  "shadrack.lilan@shamiri.institute",
  "wambugu.davis@shamiri.institute",
  "stanley.george@shamiri.institute",
  "benny@shamiri.institute",
  "mmbone@shamiri.institute",
  "nickson.mugambi@shamiri.institute",
  "marie.odhiambo@shamiri.institute",
  // Static test users from seed script
  "martin.odegaard@test.com",
  "declan.rice@test.com",
  "william.saliba@test.com",
  "bukayo.saka@test.com",
  "gabriel.martinelli@test.com",
  "gabriel.jesus@test.com",
  "mikel.arteta@test.com",
  "edu.gaspar@test.com",
  "ben.white@test.com",
  "kai.havertz@test.com",
  "takehiro.tomiyasu@test.com",
  "admin@shamiri.institute",
]);
