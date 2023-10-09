import { Layout } from "#/components/layout";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
