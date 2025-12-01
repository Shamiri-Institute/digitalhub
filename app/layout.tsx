import type { Metadata } from "next";
import { Figtree, Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import { Providers } from "#/components/providers";
import { authOptions } from "#/lib/auth-options";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className="h-full">
      {/* TODO: Fix all hydration warnings */}
      <body
        className={cn(inter.className, figtree.className, "flex min-h-full antialiased")}
        suppressHydrationWarning
      >
        <Providers session={session}>
          <div className="w-full">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
