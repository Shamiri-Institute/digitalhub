const BASE = "http://localhost:3000";

async function testUnauthPresign() {
  // Test 1: Default uploads bucket
  const r1 = await fetch(`${BASE}/api/s3/presigned`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "local-test.txt",
      contentType: "text/plain",
      bucket: "uploads"
    }),
  });
  const j1 = await r1.json();
  console.log("Uploads bucket:", r1.status, j1.url ? "URL minted" : "Blocked");

  // Test 2: Try other buckets
  const buckets = ["recordings", "student-attendance"];
  for (const bucket of buckets) {
    const r = await fetch(`${BASE}/api/s3/presigned`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "probe.txt",
        contentType: "text/plain",
        bucket
      }),
    });
    const text = await r.text();
    console.log(`Bucket '${bucket}':`, r.status, text.includes("url") ? "MINTED" : "BLOCKED");
  }
}

testUnauthPresign();