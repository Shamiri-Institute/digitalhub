// Spawned by cold.ts: time the DB client import and its first query, print JSON.
async function main() {
  const start = performance.now();
  const { query, close } = await import("./db");
  const imported = performance.now();
  await query("select 1");
  const queried = performance.now();
  console.log(JSON.stringify({ importMs: imported - start, firstQueryMs: queried - imported }));
  await close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
