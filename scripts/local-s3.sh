#!/usr/bin/env sh
# Runs SeaweedFS (`weed` on PATH, see README) as the S3 server for uploads in development, E2E tests and CI.
# Point the app at it from .env.development.local:
#   AWS_ENDPOINT_URL_S3=http://localhost:8333
#   S3_UPLOAD_KEY=GKdeadbeefdeadbeefdeadbeef
#   S3_UPLOAD_SECRET=0000000000000000000000000000000000000000000000000000000000000001
#   S3_RECORDINGS_BUCKET=recordings
#   S3_RECORDINGS_REGION=af-south-1
#   S3_SURVEY_PRINT_FILES_BUCKET=survey-print-files
#   S3_SURVEY_SCANS_BUCKET=survey-scans
#   S3_STUDENT_ATTENDANCE_BUCKET=student-attendance
set -eu

dir="${SEAWEEDFS_DIR:-$(pwd)/.seaweedfs}"
key_id=GKdeadbeefdeadbeefdeadbeef
secret=0000000000000000000000000000000000000000000000000000000000000001
mkdir -p "$dir/data"
chmod 700 "$dir"

# With no identity SeaweedFS accepts any signature, so a broken presigned URL would pass here and fail on AWS.
cat >"$dir/s3.json" <<EOF
{"identities":[{"name":"local","credentials":[{"accessKey":"$key_id","secretKey":"$secret"}],"actions":["Admin","Read","Write","List","Tagging"]}]}
EOF
chmod 600 "$dir/s3.json"

# -ip as well as -ip.bind: otherwise the volume server advertises the LAN address and every write fails.
weed mini -dir="$dir/data" -ip=127.0.0.1 -ip.bind=127.0.0.1 -s3.config="$dir/s3.json" -webdav=false \
  -bucket=recordings,survey-print-files,survey-scans,student-attendance >"$dir/server.log" 2>&1 &
server=$!
trap 'kill $server' INT TERM EXIT

# S3 answers before -bucket has made the buckets, so wait for them.
# Browsers upload straight to the recordings, scans and attendance buckets with presigned PUTs, so
# they need CORS.
# Print files are written by the server and downloaded through presigned links, so need none.
AWS_ENDPOINT_URL_S3=http://localhost:8333 node -e '
const { S3Client, HeadBucketCommand, PutBucketCorsCommand } = require("@aws-sdk/client-s3");
const s3 = new S3Client({
  region: "af-south-1",
  forcePathStyle: true,
  credentials: { accessKeyId: process.argv[1], secretAccessKey: process.argv[2] },
});
const buckets = ["recordings", "survey-print-files", "survey-scans", "student-attendance"];
(async () => {
  for (let attempt = 1; ; attempt++) {
    try {
      await Promise.all(buckets.map((Bucket) => s3.send(new HeadBucketCommand({ Bucket }))));
      break;
    } catch (error) {
      if (attempt === 120) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  const cors = { CORSRules: [{ AllowedOrigins: ["http://localhost:3000"], AllowedMethods: ["GET", "PUT", "HEAD"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"] }] };
  await Promise.all(["recordings", "survey-scans", "student-attendance"].map((Bucket) =>
    s3.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: cors })),
  ));
  console.log("SeaweedFS S3 ready on http://localhost:8333 (buckets: " + buckets.join(", ") + ")");
})();
' "$key_id" "$secret"

wait $server
