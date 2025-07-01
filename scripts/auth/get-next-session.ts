import { db } from "#/lib/db";
import { generateSessionToken } from "#/tests/helpers";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run next-auth:session -- <email>");
    process.exit(1);
  }

  const token = await generateSessionToken(email);

  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const futureTimestamp = Math.floor(futureDate.getTime() / 1000);

  const cookie = {
    name: "next-auth.session-token",
    value: token,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    expires: futureTimestamp,
  };

  console.log(`Add the following cookie to your browser to simulate being logged in as ${email}`);
  console.log(JSON.stringify(cookie, null, 2));
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
