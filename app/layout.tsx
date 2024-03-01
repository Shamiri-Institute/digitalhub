import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { Figtree, Inter } from "next/font/google";

import { Providers } from "#/components/providers";
import { cn } from "#/lib/utils";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const figtree = Figtree({ subsets: ["latin"], weight: ["600"] });

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
      <body
        className={cn(
          inter.className,
          figtree.className,
          "flex min-h-full antialiased",
        )}
      >
        <Providers session={session}>
          <div className="w-full">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
