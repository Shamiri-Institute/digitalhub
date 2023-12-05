"use client";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { useToast } from "#/components/ui/use-toast";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const [showEmailOption, setShowEmailOption] = useState(false);
  const [email, setEmail] = useState("");
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const [clickedEmail, setClickedEmail] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const error = searchParams?.get("error");
    error && toast({ title: error });
  }, [searchParams, toast]);

  // TODO: see if all we need is google sign in for now
  const enableMagicLink = false;

  return (
    <>
      <Button
        variant="brand"
        onClick={() => {
          setClickedGoogle(true);
          signIn("google", {
            ...(next && next.length > 0 ? { callbackUrl: next } : {}),
          });
        }}
        // loading={clickedGoogle}
        disabled={clickedEmail}
        className="flex gap-2"
      >
        <Icons.google className="h-4 w-4" />
        Continue with Google
      </Button>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setClickedEmail(true);
          fetch("/api/auth/account-exists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          })
            .then(async (res) => {
              const { exists } = await res.json();
              if (exists) {
                signIn("email", {
                  email,
                  redirect: false,
                  ...(next && next.length > 0 ? { callbackUrl: next } : {}),
                }).then((res) => {
                  setClickedEmail(false);
                  if (res?.ok && !res?.error) {
                    setEmail("");
                    toast({ description: "Email sent - check your inbox!" });
                  } else {
                    toast({
                      variant: "destructive",
                      description: "Error sending email - try again?",
                    });
                  }
                });
              } else {
                toast({
                  variant: "destructive",
                  description: "No account found with that email address.",
                });
                setClickedEmail(false);
              }
            })
            .catch(() => {
              setClickedEmail(false);
              toast({
                variant: "destructive",
                description: "Error sending email - try again?",
              });
            });
        }}
        className="flex flex-col space-y-3"
      >
        {showEmailOption && (
          <div>
            <div className="mb-4 mt-1 border-t border-gray-300" />
            <input
              id="email"
              name="email"
              autoFocus
              type="email"
              placeholder="panic@thedis.co"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
            />
          </div>
        )}
        {enableMagicLink && (
          <Button
            variant="secondary"
            {...(!showEmailOption && {
              type: "button",
              onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                setShowEmailOption(true);
              },
            })}
            disabled={clickedGoogle}
            className="flex gap-2"
          >
            <Icons.mail className="h-4 w-4" />
            Continue with Email
          </Button>
        )}
      </form>
    </>
  );
}
