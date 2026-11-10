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

/**
 * Code that loads after the page instead of with it. `useLoaded()` gives null until the code has
 * arrived and starts fetching it once a component that needs it has mounted; `load()` fetches it
 * now, and tries again after a failed fetch.
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
    // effect: fetches the code once the page is interactive, off its critical path
    useEffect(() => {
      void load();
    }, []);
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
    return {
      standInHandlers: {
        onClick: () => {
          pressedEarly = true;
          void load();
        },
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
