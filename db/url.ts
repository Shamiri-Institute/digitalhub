export function databaseUrl() {
  const connectionString = process.env.DATABASE_URL ?? "";
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (local || url.searchParams.has("sslmode")) return connectionString;
  url.searchParams.set("sslmode", "no-verify");
  return url.toString();
}
