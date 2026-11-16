import type { Metadata } from "next";
import { redirect } from "next/navigation";
import * as React from "react";

import { LoginForm } from "#/app/(auth)/login/form";
import { Icons } from "#/components/icons";
import { getCachedSession } from "#/lib/auth";

export const metadata: Metadata = {
  title: "Log in to SDH",
  description: "The Shamiri Digital Hub is a platform for managing the Shamiri Intervention.",
};

export default async function LoginPage() {
  if (await getCachedSession()) {
    redirect("/");
  }

  return (
    <div className="mx-4 w-full max-w-md overflow-hidden rounded-xl border bg-white">
      <div className="flex flex-col items-center gap-3 bg-primary px-6 pb-8 pt-10 text-center">
        <Icons.logo className="h-10 w-auto text-white" />
        <p className="text-sm font-semibold uppercase tracking-wider text-lime">Digital Hub</p>
      </div>
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-12">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-primary">Sign in</h1>
          <p className="text-muted-foreground">The platform powering the Shamiri Intervention.</p>
        </div>
        <React.Suspense fallback={<div className="h-9 rounded-md bg-muted" />}>
          <LoginForm />
        </React.Suspense>
      </div>
    </div>
  );
}
