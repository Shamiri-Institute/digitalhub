import { useEffect, useRef } from "react";

const LEAVE_MESSAGE = "You have unsaved changes. Leave without saving?";

/**
 * The parts of the browser's Navigation API used here. TypeScript's DOM types don't include it
 * yet, and not every browser has it, so it is optional.
 */
type NavigateEvent = Event & { navigationType: string; cancelable: boolean };
type NavigationApi = Pick<EventTarget, "addEventListener" | "removeEventListener">;

/**
 * Asks before leaving while there are unsaved changes: on reload or closing the tab, on a click of
 * any link in the app (the sidebar's included), and on the browser's Back and Forward. Returns a
 * function to call just before leaving on purpose, such as a reload the page offers.
 */
export function useLeaveGuard(unsaved: boolean, message = LEAVE_MESSAGE) {
  const leaving = useRef(false);

  // effect: listens to the window, document and navigation, outside React, while there are unsaved changes
  useEffect(() => {
    if (!unsaved) {
      return;
    }
    const confirmLeave = () => leaving.current || window.confirm(message);

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!leaving.current) {
        event.preventDefault();
      }
    };
    // Capture phase, so it runs before the router handles the click of a Link.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      // A control that navigates with the router instead of a link names its target in
      // data-leave-href, as TabToggleNavigation's tabs do.
      const target =
        event.target instanceof Element ? event.target.closest("a[href], [data-leave-href]") : null;
      if (!target) return;
      let href: string;
      if (target instanceof HTMLAnchorElement) {
        if (target.target === "_blank" || target.download) return;
        href = target.href;
      } else {
        href = target.getAttribute("data-leave-href") ?? "";
      }
      const url = new URL(href, window.location.href);
      const here = window.location;
      if (url.origin !== here.origin) return;
      if (url.pathname === here.pathname && url.search === here.search) return;
      if (!confirmLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    // Back and Forward within the app don't unload the page; the router handles them.
    const onNavigate = (event: Event) => {
      const navigate = event as NavigateEvent;
      if (navigate.navigationType === "traverse" && navigate.cancelable && !confirmLeave()) {
        event.preventDefault();
      }
    };
    const navigation = (window as Window & { navigation?: NavigationApi }).navigation;

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    navigation?.addEventListener("navigate", onNavigate);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      navigation?.removeEventListener("navigate", onNavigate);
    };
  }, [unsaved, message]);

  return () => {
    leaving.current = true;
  };
}
