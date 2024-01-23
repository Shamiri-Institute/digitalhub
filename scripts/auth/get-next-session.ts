import { db } from "#/lib/db";
import { JWT, encode } from "next-auth/jwt";

export async function generateSessionToken(email: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { email },
    include: { memberships: true },
  });

  const jwtPayload: JWT = {
    name: user.name,
    email: user.email,
    picture: null,
    sub: user.id,
    activeMembership: user.memberships[0],
    memberships: user.memberships.map((m) => ({
      id: m.id,
      implementerId: m.implementerId,
      role: m.role,
      identifier: m.identifier,
    })),
  };

  return await encode({
    token: jwtPayload,
    secret: process.env.NEXTAUTH_SECRET!,
  });
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run next-auth:session -- <email>");
    process.exit(1);
  }

  const token = await generateSessionToken(email);

  let futureDate = new Date();
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

  console.log(
    `Add the following cookie to your browser to simulate being logged in as ${email}`,
  );
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
