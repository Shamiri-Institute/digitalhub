#!/usr/bin/env sh
# Runs Garage (brew install garage) as a local S3 server for uploads in development and E2E tests.
# Point the app at it from .env.development.local:
#   AWS_ENDPOINT_URL_S3=http://localhost:3900
#   S3_UPLOAD_KEY=GKdeadbeefdeadbeefdeadbeef
#   S3_UPLOAD_SECRET=0000000000000000000000000000000000000000000000000000000000000001
#   S3_RECORDINGS_BUCKET=recordings
#   S3_RECORDINGS_REGION=af-south-1
set -eu

dir="${GARAGE_DIR:-$(pwd)/.garage}"
key_id=GKdeadbeefdeadbeefdeadbeef
secret=0000000000000000000000000000000000000000000000000000000000000001
mkdir -p "$dir"
chmod 700 "$dir"

cat >"$dir/garage.toml" <<EOF
metadata_dir = "$dir/meta"
data_dir = "$dir/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "127.0.0.1:3901"
rpc_secret = "1111111111111111111111111111111111111111111111111111111111111111"

[s3_api]
s3_region = "af-south-1"
api_bind_addr = "127.0.0.1:3900"
root_domain = ".localhost"
EOF
chmod 600 "$dir/garage.toml"

garage() { command garage -c "$dir/garage.toml" "$@"; }

garage server >"$dir/server.log" 2>&1 &
server=$!
trap 'kill $server' INT TERM EXIT

until garage status >/dev/null 2>&1; do sleep 0.5; done

if ! garage layout show | grep -q "Current cluster layout version: [1-9]"; then
  node_id=$(garage node id -q | cut -d@ -f1)
  garage layout assign -z local -c 10G "$node_id"
  garage layout apply --version 1
fi
garage key info "$key_id" >/dev/null 2>&1 || garage key import --yes -n local "$key_id" "$secret"
garage bucket info recordings >/dev/null 2>&1 || garage bucket create recordings
garage bucket allow --read --write --owner recordings --key "$key_id"

# Browsers upload straight to the bucket with presigned PUTs, so the bucket needs CORS.
AWS_ENDPOINT_URL_S3=http://localhost:3900 node -e '
const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");
new S3Client({
  region: "af-south-1",
  credentials: { accessKeyId: process.argv[1], secretAccessKey: process.argv[2] },
}).send(new PutBucketCorsCommand({
  Bucket: "recordings",
  CORSConfiguration: { CORSRules: [{ AllowedOrigins: ["http://localhost:3000"], AllowedMethods: ["GET", "PUT", "HEAD"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"] }] },
})).then(() => console.log("Garage S3 ready on http://localhost:3900 (bucket: recordings)"));
' "$key_id" "$secret"

wait $server
