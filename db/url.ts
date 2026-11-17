// Previews share one instance; each branch gets its own database there.
// iac-aws drops the database of a deleted branch with the same naming rule.
export function previewDatabaseName(branch: string) {
  return `preview_${branch.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`.slice(0, 63);
}

export function databaseUrl() {
  const previewUrl = process.env.PREVIEW_DATABASE_URL;
  const connectionString = previewUrl || process.env.DATABASE_URL || "";
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(`${previewUrl ? "PREVIEW_DATABASE_URL" : "DATABASE_URL"} is not a valid URL`);
  }
  if (previewUrl) {
    const branch = process.env.VERCEL_GIT_COMMIT_REF;
    if (!branch) throw new Error("PREVIEW_DATABASE_URL needs VERCEL_GIT_COMMIT_REF");
    url.pathname = `/${previewDatabaseName(branch)}`;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!local && !url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "no-verify");
  return url.toString();
}
