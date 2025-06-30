"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, createContext, useContext, useEffect, useRef } from "react";
import { create } from "zustand";

import { Header } from "#/components/header";
import { Navigation } from "#/components/navigation";
import { Sheet, SheetContent } from "#/components/ui/sheet";
import { cn } from "#/lib/utils";

function MenuIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg viewBox="0 0 10 9" fill="none" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M.5 1h9M.5 8h9M.5 4.5h9" />
    </svg>
  );
}

function XIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg viewBox="0 0 10 9" fill="none" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="m1.5 1 7 7M8.5 1l-7 7" />
    </svg>
  );
}

const IsInsideMobileNavigationContext = createContext(false);

function MobileNavigationDialog({
  isOpen,
  open,
  close,
}: {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialPathname = useRef(pathname).current;
  const initialSearchParams = useRef(searchParams).current;

  useEffect(() => {
    if (pathname !== initialPathname || searchParams !== initialSearchParams) {
      close();
    }
  }, [pathname, searchParams, close, initialPathname, initialSearchParams]);

  function onClickDialog(event: React.MouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    const link = event.target.closest("a");
    if (
      link &&
      link.pathname + link.search + link.hash ===
        window.location.pathname + window.location.search + window.location.hash
    ) {
      close();
    }
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(openBool) => (openBool ? open() : close())}>
        <SheetContent side="left" className="left-0 w-full">
          <div
            className={cn(
              "fixed bottom-0 left-0 top-14 w-full overflow-y-auto px-4 pb-4 pt-6 min-[416px]:max-w-sm sm:px-6 sm:pb-10",
            )}
          >
            <Header className="pointer-events-auto z-100" />
            <Navigation />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function useIsInsideMobileNavigation() {
  return useContext(IsInsideMobileNavigationContext);
}

export const useMobileNavigationStore = create<{
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));

export function MobileNavigation() {
  const isInsideMobileNavigation = useIsInsideMobileNavigation();
  const { isOpen, toggle, open, close } = useMobileNavigationStore();

  return (
    <IsInsideMobileNavigationContext.Provider value={true}>
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-zinc-900/5"
        aria-label="Toggle navigation"
        onClick={toggle}
      >
        <MenuIcon className="w-2.5 stroke-zinc-900" />
      </button>
      {!isInsideMobileNavigation && (
        <Suspense fallback={null}>
          <MobileNavigationDialog isOpen={isOpen} open={open} close={close} />
        </Suspense>
      )}
    </IsInsideMobileNavigationContext.Provider>
  );
}
