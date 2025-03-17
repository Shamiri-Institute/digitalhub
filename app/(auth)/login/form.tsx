"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { useToast } from "#/components/ui/use-toast";
import { Input } from "#/components/ui/input";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const error = searchParams?.get("error");
    error && toast({ title: error });
  }, [searchParams, toast]);

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('');


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClickedGoogle(true);
    //setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        //redirect: false,
      });
      console.log({ result })

      if (result?.error) {
        //setError('Invalid email or password');
      } else if (result?.ok) {
        // router.push('/dashboard'); // Redirect to dashboard or home page
        // router.refresh(); // Refresh to update auth state
      }
    } catch (err) {
      //setError('Something went wrong. Please try again.');
    } finally {
      //setIsLoading(false);
    }
  };

  if (process.env.NEXT_PUBLIC_ENV !== 'production') {
    return (
      <form onSubmit={handleSubmit}>
        <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input type="password" placeholder="******" value={password} onChange={e => setPassword(e.target.value)} />
        <Button variant="brand" type="submit" disabled={clickedGoogle}>Login</Button>
      </form>
    )
  }


  return (
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
  );
}
