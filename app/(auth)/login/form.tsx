"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { useToast } from "#/components/ui/use-toast";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const error = searchParams?.get("error");
    error && toast({ title: error });
  }, [searchParams, toast]);

  return (
    <Button
      variant="brand"
      disabled={clickedGoogle}
      onClick={() => {
        setClickedGoogle(true);
        void signIn("google", { callbackUrl: "/?login=1" });
      }}
      className="flex gap-2"
      data-testid="google-login"
    >
      <Icons.google className="h-4 w-4" />
      Continue with Google
    </Button>
  );
}
