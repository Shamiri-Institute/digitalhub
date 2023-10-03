import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";

import { cn } from "#/lib/utils";
import { Providers } from "#/components/providers";
import { Layout } from "#/components/layout";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | Shamiri Digital Hub",
    default: "Shamiri Digital Hub",
  },
  description: "The operational back-end for the Shamiri Institute",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <html lang="en" className="h-full">
      <body className={cn(inter.className, "flex min-h-full antialiased")}>
        <Providers session={session}>
          <div className="w-full">
            <Layout>{children}</Layout>
          </div>
        </Providers>
      </body>
    </html>
  );
}
