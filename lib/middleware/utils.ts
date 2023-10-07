import { NextRequest } from "next/server";

export const parse = (req: NextRequest) => {
  let domain = req.headers.get("host") as string;

  let path = req.nextUrl.pathname;

  const searchParams = req.nextUrl.searchParams.toString();
  const fullPath = `${path}${
    searchParams.length > 0 ? `?${searchParams}` : ""
  }`;

  const key = decodeURIComponent(path.split("/")?.[1] ?? "");
  const fullKey = decodeURIComponent(path.slice(1));

  return { domain, path, fullPath, key, fullKey };
};
