import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";

import { cn } from "#/lib/utils";
import { Providers } from "#/components/providers";
import { SessionProvider } from "#/components/session-provider";

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
        <Providers>
          <div className="w-full">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
