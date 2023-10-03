import { UploadImageCommand } from "#/commands/upload-image";
import { test } from "@playwright/test";

const S3UrlPrefix =
  "https://shamiridigitalhub-public.s3.af-south-1.amazonaws.com";

test("image upload", async () => {
  const output = await new UploadImageCommand().run({
    url: `${S3UrlPrefix}/tom-osborn-headshot.jpeg`,
  });
  console.log({ output });
});
