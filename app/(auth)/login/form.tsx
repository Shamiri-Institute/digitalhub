"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { useToast } from "#/components/ui/use-toast";
import EmailPasswordLoginForm from "./email-password-form";

function showEmailPasswordForm() {
  console.log({ loginStuff: process.env });
  return process.env.NEXT_PUBLIC_ENV === "production" ? null : (
    <>
      <EmailPasswordLoginForm />
      <div className="flex items-center py-5">
        <div className="flex-grow border-t border-gray-400"></div>
        <span className="mx-4 flex-shrink text-gray-400">Or</span>
        <div className="flex-grow border-t border-gray-400"></div>
      </div>
    </>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const error = searchParams?.get("error");
    error && toast({ title: error });
  }, [searchParams, toast]);

  return (
    <>
      {showEmailPasswordForm()}
      <Button
        variant="brand"
        disabled={clickedGoogle}
        onClick={() => {
          setClickedGoogle(true);
          signIn("google", { callbackUrl: "/?login=1" });
        }}
        className="flex gap-2"
        data-testid="google-login"
      >
        <Icons.google className="h-4 w-4" />
        Continue with Google
      </Button>
    </>
  );
}
