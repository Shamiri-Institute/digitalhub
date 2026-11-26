// Where the SDH notifies the pipeline. Shared by env.ts, which checks the setting at start, and the
// notification code, which reads it at each run.

/** The URL notifications go to, or undefined for a setting that can't be one: http(s) only, and
 * no query string or fragment, as the signature covers the path alone. */
export function pipelineUploadsUrl(setting: string): URL | undefined {
  if (setting.includes("?") || setting.includes("#")) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(setting);
  } catch {
    return undefined;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return undefined;
  }
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/uploads`;
  return url;
}
