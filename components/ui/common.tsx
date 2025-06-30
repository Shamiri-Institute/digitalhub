import Link from "next/link";

export function LinkOrDiv({ href, children }: { href?: string; children: React.ReactNode }) {
  if (href) {
    return <Link href={href}>{children}</Link>;
  }

  return <div>{children}</div>;
}
