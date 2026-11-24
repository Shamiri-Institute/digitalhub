// S3 reports a SHA-256 in base64; the SDH stores and names files by it in lowercase hex.

export function base64Checksum(sha256Hex: string) {
  return Buffer.from(sha256Hex, "hex").toString("base64");
}

export function hexChecksum(sha256Base64: string) {
  return Buffer.from(sha256Base64, "base64").toString("hex");
}
