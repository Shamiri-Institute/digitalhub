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
    <div className="relative z-10 mx-6 h-fit w-full max-w-md overflow-hidden rounded-2xl border border-border sm:shadow-xl lg:mx-0">
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-grey-border bg-white px-4 py-6 pt-8 text-center sm:px-16">
        <Icons.logo className="h-9 text-shamiri-new-blue lg:h-10" />
        <p className="text-sm text-muted-foreground">
          The platform powering the Shamiri Intervention
        </p>
      </div>
      <div className="flex flex-col space-y-3 bg-background-secondary px-4 py-8 sm:px-16">
        <React.Suspense fallback={<div className="mx-auto h-5 w-3/4 rounded-lg bg-muted" />}>
          <LoginForm />
        </React.Suspense>
      </div>
    </div>
  );
}
