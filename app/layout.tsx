import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { figtree } from "#/app/fonts/figtree";
import { Providers } from "#/components/providers";
import { cn } from "#/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Shamiri Digital Hub",
    default: "Shamiri Digital Hub",
  },
  description: "The operational back-end for the Shamiri Institute",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={cn(figtree.className, "flex min-h-full antialiased")}
        suppressHydrationWarning
      >
        <Providers>
          <div className="w-full">{children}</div>
        </Providers>
      </body>
      <SpeedInsights />
    </html>
  );
}
