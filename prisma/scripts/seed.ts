import { db } from "#/lib/db";

import fixtures from "./fixtures";

async function seedDatabase() {
  await db.user.createMany({
    data: fixtures.users,
  });
}

seedDatabase()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
