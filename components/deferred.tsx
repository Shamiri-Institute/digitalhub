"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import {
  type ComponentType,
  cloneElement,
  type ReactElement,
  type Ref,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

// The events that show a person is at the page. Focus and scroll also fire on their own while a
// page loads (autofocus, scroll restoration), so they do not count.
const INTERACTIONS = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel"] as const;
let interacted = false;
const waitingForInteraction = new Set<() => void>();

function onInteraction() {
  interacted = true;
  for (const type of INTERACTIONS) window.removeEventListener(type, onInteraction, true);
  for (const start of waitingForInteraction) start();
  waitingForInteraction.clear();
}

/** Runs `start` once the visitor first interacts with the page, or now if they already have. */
function afterFirstInteraction(start: () => void) {
  if (interacted) {
    start();
    return () => {};
  }
  if (waitingForInteraction.size === 0) {
    for (const type of INTERACTIONS) {
      window.addEventListener(type, onInteraction, { capture: true, passive: true });
    }
  }
  waitingForInteraction.add(start);
  return () => {
    waitingForInteraction.delete(start);
  };
}

/**
 * Code a page needs only once someone uses it: menus, selects, tooltips, dialogs. It is fetched
 * when the visitor first moves the pointer, touches, presses a key or scrolls with a wheel, not
 * while the page itself loads, so a visit that opens none of them never downloads it.
 * `useLoaded()` gives null until the code has arrived; `load()` fetches it now, and tries again
 * after a failed fetch.
 */
export function afterPage<T>(fetchCode: () => Promise<T>) {
  let loaded: T | null = null;
  let loading: Promise<T> | null = null;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const load = () => {
    loading ??= fetchCode().then(
      (code) => {
        loaded = code;
        for (const listener of listeners) listener();
        return code;
      },
      (error: unknown) => {
        loading = null;
        throw error;
      },
    );
    return loading;
  };
  function useLoaded() {
    // effect: subscribes to the visitor's first interaction, a window event, to fetch the code
    useEffect(() => afterFirstInteraction(() => void load()), []);
    return useSyncExternalStore(
      subscribe,
      () => loaded,
      () => null,
    );
  }
  return [useLoaded, load] as const;
}

function setRef(ref: Ref<HTMLElement> | undefined, node: HTMLElement | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

/**
 * A trigger drawn on its own while its component's code loads, then replaced by the real one. A
 * press on the stand-in opens the real trigger once it arrives, and a focused stand-in hands its
 * focus over. One stable object per trigger, so the real trigger's ref never changes.
 */
export function useStandIn(load: () => Promise<unknown>) {
  const [standIn] = useState(() => {
    let pressedEarly = false;
    let focusedEarly = false;
    const press = () => {
      pressedEarly = true;
      void load();
    };
    return {
      standInHandlers: {
        // A press counts from pointerdown: if the real trigger takes over before pointerup, the
        // browser fires no click on either button.
        onPointerDown: press,
        onClick: press,
        onFocus: () => {
          focusedEarly = true;
        },
        onBlur: () => {
          focusedEarly = false;
        },
      },
      takeOver: (node: HTMLElement | null) => {
        if (!node) return;
        if (focusedEarly) {
          focusedEarly = false;
          node.focus();
        }
        if (pressedEarly) {
          pressedEarly = false;
          // A click from script has detail 0, which Base UI reads as a keyboard open, so the
          // first item is focused, as it is when a keyboard opens the real trigger.
          queueMicrotask(() => node.click());
        }
      },
    };
  });
  return standIn;
}

export type StandIn = ReturnType<typeof useStandIn>;

/**
 * A part that draws nothing until it is opened, such as a closed dialog or a collapsed row's
 * details, with code that loads after the page. Until the code arrives it renders nothing; one
 * opened before then shows once it does.
 */
export function deferredHidden<P extends object>(fetchPart: () => Promise<ComponentType<P>>) {
  const [usePart] = afterPage(fetchPart);
  return function DeferredHidden(props: P) {
    const Part = usePart();
    return Part ? <Part {...props} /> : null;
  };
}

type Trigger = ReactElement<{ ref?: Ref<HTMLElement> }>;

/**
 * A menu or popover whose code loads after the page instead of with it. It takes its trigger as a
 * prop and draws it as a stand-in until the component arrives.
 */
export function deferred<P extends { trigger: ReactElement }>(
  fetchComponent: () => Promise<ComponentType<P>>,
) {
  const [useComponent, load] = afterPage(fetchComponent);

  return function Deferred(props: P) {
    const Component = useComponent();
    const { standInHandlers, takeOver } = useStandIn(load);
    const trigger = props.trigger as Trigger;

    if (!Component) {
      return cloneElement(trigger, mergeProps(trigger.props, standInHandlers));
    }
    return (
      <Component
        {...props}
        trigger={cloneElement(trigger, {
          ref: (node: HTMLElement | null) => {
            setRef(trigger.props.ref, node);
            takeOver(node);
          },
        })}
      />
    );
  };
}
