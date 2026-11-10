import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import { Providers } from "#/components/providers";
import { cn } from "#/lib/utils";
import "./globals.css";

// The One Shamiri typeface; globals.css maps it to font-sans.
const urbanist = Urbanist({ subsets: ["latin"], variable: "--font-urbanist" });

export const metadata: Metadata = {
  title: {
    template: "%s | Shamiri Digital Hub",
    default: "Shamiri Digital Hub",
  },
  description: "The operational back-end for the Shamiri Institute",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(urbanist.variable, "h-full")}>
      <body className="flex min-h-full font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <div className="w-full">{children}</div>
        </Providers>
      </body>
      <SpeedInsights />
    </html>
  );
}
