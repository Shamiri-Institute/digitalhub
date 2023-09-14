import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";

import SessionProvider from "#/app/components/SessionProvider";
import { cn } from "#/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shamiri Digital Hub",
  description: "The operational back-end for The Shamiri Institute",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <html lang="en" className="h-full bg-white">
      <body className={cn(inter.className, "h-full")}>
        <SessionProvider session={session}>
          <main className="mx-auto max-w-7xl text-2xl flex gap-2">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
