#!/usr/bin/env tsx

import { randomBytes } from "crypto";

function generateApiKey(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

function generateHmacSecret(length: number = 32): string {
  return randomBytes(length).toString("base64");
}

console.log("Generated API Keys:");
console.log("==================");
console.log(`SESSION_ANALYSIS_API_KEY=${generateApiKey()}`);
console.log(`SESSION_ANALYSIS_API_KEY_BACKUP=${generateApiKey()}`);
console.log(`SESSION_ANALYSIS_SIGNATURE_SECRET=${generateHmacSecret()}`);
console.log();
console.log("Add these to your .env file");
