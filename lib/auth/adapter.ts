import { and, eq } from "drizzle-orm";
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";

import { db } from "#/db/client";
import { account, session, user, verificationToken } from "#/db/schema";

// Port of the pg adapter in @auth/drizzle-adapter, typed against next-auth 4. The package
// itself peer-depends on a newer @auth/core than next-auth 4 ships and its Adapter type differs.

type UserRow = typeof user.$inferSelect;

// next-auth types `email` as required; every user that signs in has one (Google verifies it).
const toAdapterUser = (row: UserRow) => row as AdapterUser;

type AccountKey = Pick<AdapterAccount, "provider" | "providerAccountId">;

// Some Adapter members are unions with @auth/core's newer signatures, so the parameters
// below are annotated explicitly instead of relying on contextual typing.
export const drizzleAdapter: Adapter = {
  async createUser(data: Omit<AdapterUser, "id">) {
    const [row] = await db
      .insert(user)
      .values({
        email: data.email,
        emailVerified: data.emailVerified,
        name: data.name ?? null,
        image: data.image ?? null,
      })
      .returning();
    if (!row) throw new Error("createUser returned no row");
    return toAdapterUser(row);
  },

  async getUser(id) {
    const row = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, id) });
    return row ? toAdapterUser(row) : null;
  },

  async getUserByEmail(email) {
    const row = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, email) });
    return row ? toAdapterUser(row) : null;
  },

  async getUserByAccount({ provider, providerAccountId }: AccountKey) {
    const [row] = await db
      .select({ user })
      .from(account)
      .innerJoin(user, eq(account.userId, user.id))
      .where(and(eq(account.provider, provider), eq(account.providerAccountId, providerAccountId)));
    return row ? toAdapterUser(row.user) : null;
  },

  async updateUser({ id, ...data }) {
    const [row] = await db.update(user).set(data).where(eq(user.id, id)).returning();
    if (!row) throw new Error("No user found.");
    return toAdapterUser(row);
  },

  async deleteUser(id) {
    await db.delete(user).where(eq(user.id, id));
  },

  async linkAccount(data: AdapterAccount) {
    await db.insert(account).values({
      userId: data.userId,
      type: data.type,
      provider: data.provider,
      providerAccountId: data.providerAccountId,
      refresh_token: data.refresh_token,
      access_token: data.access_token,
      expires_at: data.expires_at,
      token_type: data.token_type,
      scope: data.scope,
      id_token: data.id_token,
      session_state: data.session_state,
    });
  },

  async unlinkAccount({ provider, providerAccountId }: AccountKey) {
    await db
      .delete(account)
      .where(and(eq(account.provider, provider), eq(account.providerAccountId, providerAccountId)));
  },

  async createSession(data) {
    const [row] = await db.insert(session).values(data).returning();
    if (!row) throw new Error("createSession returned no row");
    return row;
  },

  async getSessionAndUser(sessionToken) {
    const [row] = await db
      .select({ session, user })
      .from(session)
      .innerJoin(user, eq(user.id, session.userId))
      .where(eq(session.sessionToken, sessionToken));
    return row ? { session: row.session, user: toAdapterUser(row.user) } : null;
  },

  async updateSession(data) {
    const [row] = await db
      .update(session)
      .set(data)
      .where(eq(session.sessionToken, data.sessionToken))
      .returning();
    return row ?? null;
  },

  async deleteSession(sessionToken) {
    await db.delete(session).where(eq(session.sessionToken, sessionToken));
  },

  async createVerificationToken(data) {
    const [row] = await db.insert(verificationToken).values(data).returning();
    return row ?? null;
  },

  async useVerificationToken({ identifier, token }) {
    const [row] = await db
      .delete(verificationToken)
      .where(and(eq(verificationToken.identifier, identifier), eq(verificationToken.token, token)))
      .returning();
    return row ?? null;
  },
};
