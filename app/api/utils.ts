export function appUrl() {
  let url = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error("No URL found");
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  } else if (/^http:\/\//i.test(url)) {
    url = url.replace(/^http:\/\//i, "https://");
  }
  return url;
}
