// DATABASE_URL for pg and drizzle-kit. Prisma defaulted to sslmode=prefer (encrypted, no CA
// check); pg refuses RDS without one, so remote URLs that do not set sslmode get no-verify.
export function databaseUrl() {
  const connectionString = process.env.DATABASE_URL ?? "";
  const url = new URL(connectionString);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (local || url.searchParams.has("sslmode")) return connectionString;
  url.searchParams.set("sslmode", "no-verify");
  return url.toString();
}
