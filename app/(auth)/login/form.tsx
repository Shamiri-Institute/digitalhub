"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { useToast } from "#/components/ui/use-toast";
import { isCredentialAuthAllowedClient } from "#/lib/auth/client-credential-auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const [isCredentialLogin, setIsCredentialLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const showCredentialAuth = isCredentialAuthAllowedClient();

  useEffect(() => {
    const error = searchParams?.get("error");
    if (error) {
      const errorMessage = error === "CredentialsSignin" ? "Invalid email or password" : error;
      toast({ title: errorMessage, variant: "destructive" });
    }
  }, [searchParams, toast]);

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Please enter email and password", variant: "destructive" });
      return;
    }
    setIsCredentialLogin(true);
    try {
      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/?login=1",
      });
    } finally {
      setIsCredentialLogin(false);
    }
  };

  const isLoading = clickedGoogle || isCredentialLogin;

  return (
    <div className="flex flex-col space-y-4">
      <Button
        variant="brand"
        disabled={isLoading}
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

      {showCredentialAuth && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-50 px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleCredentialSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                data-testid="email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                data-testid="password-input"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={isLoading}
              data-testid="credentials-login"
            >
              {isCredentialLogin ? "Signing in..." : "Sign in with Email"}
            </Button>
          </form>

          <div className="rounded-md bg-yellow-50 p-3 text-center">
            <p className="text-xs text-yellow-800">
              Development mode - Email login is only available in non-production environments
            </p>
          </div>
        </>
      )}
    </div>
  );
}
