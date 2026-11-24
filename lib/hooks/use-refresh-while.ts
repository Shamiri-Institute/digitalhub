import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useRefreshWhile(active: boolean, everyMs: number) {
  const router = useRouter();
  // effect: a timer is an external subscription; it stops once nothing is left to wait for.
  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(timer);
  }, [active, everyMs, router]);
}
