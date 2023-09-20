import { getServerSession } from "next-auth";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export async function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
