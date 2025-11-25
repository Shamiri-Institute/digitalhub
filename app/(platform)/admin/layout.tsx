import type React from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="w-full self-stretch">{children}</div>;
}
