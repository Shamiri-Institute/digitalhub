const siteUrl = `http://localhost:${process.env.PORT ?? 3000}`;

export function getUrl(route: string) {
  return `${siteUrl}${route}`;
}
