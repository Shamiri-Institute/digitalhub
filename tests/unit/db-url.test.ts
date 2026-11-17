// @vitest-environment node
import { expect, it, vi } from "vitest";

import { databaseUrl, previewDatabaseName } from "#/db/url";

it("points a preview at its branch's own database on the preview instance", () => {
  vi.stubEnv("PREVIEW_DATABASE_URL", "postgres://preview:secret@db.example.com:5432/postgres");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "feat/ENG-2561-split.deploy");

  const previewUrl = new URL(databaseUrl());

  expect(previewUrl.hostname).toBe("db.example.com");
  expect(previewUrl.pathname).toBe("/preview_feat_eng_2561_split_deploy");
  expect(previewUrl.searchParams.get("sslmode")).toBe("no-verify");
  expect(previewDatabaseName("feat/".repeat(30))).toHaveLength(63);
});
