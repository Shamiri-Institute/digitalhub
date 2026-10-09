import { pool } from "#/db/client";
import { sessionCookieFor } from "#/tests/helpers";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run auth:session -- <email>");
    process.exit(1);
  }

  const cookie = await sessionCookieFor(email);
  console.log(`Add the following cookie to your browser to simulate being logged in as ${email}`);
  console.log(JSON.stringify(cookie, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
