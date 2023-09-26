// TODO: implement file upload (POST) and download (GET)
// - save files to disk
// - load files from disc based on id (public Id) query param
// - use good cache headers so CDN or browser can cache the files
// - in prod, redirect to signed url for upload from browser

import type { NextRequest } from "next/server";

export const POST = async (request: NextRequest) => {
  throw new Error("Not implemented");
};
