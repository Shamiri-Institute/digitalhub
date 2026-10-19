import { useEffect } from "react";

const LEAVE_MESSAGE = "You have unsaved changes. Leave without saving?";

/**
 * Asks before leaving while there are unsaved changes: on reload or closing the tab, and on a click
 * of any link in the app, including the sidebar's.
 */
export function useLeaveGuard(unsaved: boolean) {
  // effect: listens to the window and document, outside React, only while there are unsaved changes
  useEffect(() => {
    if (!unsaved) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    // Capture phase, so it runs before the router handles the click of a Link.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.download) return;
      const url = new URL(link.href);
      const here = window.location;
      if (url.origin !== here.origin) return;
      if (url.pathname === here.pathname && url.search === here.search) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [unsaved]);
}
