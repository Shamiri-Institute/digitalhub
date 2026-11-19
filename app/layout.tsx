import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Figtree, Inter } from "next/font/google";
import { Providers } from "#/components/providers";
import { cn } from "#/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-inter" });
const figtree = Figtree({ subsets: ["latin"], weight: ["600"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: {
    template: "%s | Shamiri Digital Hub",
    default: "Shamiri Digital Hub",
  },
  description: "The operational back-end for the Shamiri Institute",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full", inter.variable, figtree.variable)}>
      <body className="flex min-h-full antialiased" suppressHydrationWarning>
        <Providers>
          <div className="w-full">{children}</div>
        </Providers>
      </body>
      <SpeedInsights />
    </html>
  );
}
