import * as React from "react";

import { LoginForm } from "#/app/(auth)/login/form";
import { Icons } from "#/components/icons";
import { constructMetadata } from "#/lib/utils";

export const metadata = constructMetadata({
  title: "Log in to SDH",
});

export default function LoginPage() {
  return (
    <div className="relative z-10 mx-6 mt-[calc(30vh)] h-fit w-full max-w-md overflow-hidden rounded-2xl border border-border sm:shadow-xl lg:mx-0">
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
        <Icons.logo className="h-9 text-sky-600 lg:h-10" />
        <p className="text-sm text-gray-500">
          The platform powering the Shamiri Intervention
        </p>
      </div>
      <div className="flex flex-col space-y-3 bg-gray-50 px-4 py-8 sm:px-16">
        <React.Suspense
          fallback={
            <>
              <div className="mx-auto h-5 w-3/4 rounded-lg bg-gray-100" />
            </>
          }
        >
          <LoginForm />
        </React.Suspense>
      </div>
    </div>
  );
}
