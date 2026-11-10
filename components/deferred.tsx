"use client";

import {
  type ComponentType,
  cloneElement,
  type ReactElement,
  type Ref,
  useEffect,
  useRef,
  useState,
} from "react";

type Trigger = ReactElement<{
  ref?: Ref<HTMLElement>;
  onClick?: (event: never) => void;
  onFocus?: (event: never) => void;
  onBlur?: (event: never) => void;
}>;

function setRef(ref: Ref<HTMLElement> | undefined, node: HTMLElement | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

/**
 * A menu or popover whose code loads after the page instead of with it. Until it arrives, its
 * `trigger` renders on its own, looking the same; then the real component takes the trigger over.
 * A press before then opens it as soon as it arrives, and a focused trigger stays focused.
 */
export function deferred<P extends { trigger: ReactElement }>(
  load: () => Promise<ComponentType<P>>,
) {
  let loaded: ComponentType<P> | null = null;
  let loading: Promise<ComponentType<P>> | null = null;
  const start = () => {
    loading ??= load().then((component) => (loaded = component));
    return loading;
  };

  return function Deferred(props: P) {
    const [Component, setComponent] = useState(() => loaded);
    const pressedEarly = useRef(false);
    const focusedEarly = useRef(false);
    const triggerElement = props.trigger as Trigger;
    const triggerProps = triggerElement.props;

    // effect: fetches the component's code once the page is interactive, off its critical path
    useEffect(() => {
      if (!Component) void start().then((component) => setComponent(() => component));
    }, [Component]);

    if (!Component) {
      return cloneElement(triggerElement, {
        onClick: (event: never) => {
          triggerProps.onClick?.(event);
          pressedEarly.current = true;
        },
        onFocus: (event: never) => {
          triggerProps.onFocus?.(event);
          focusedEarly.current = true;
        },
        onBlur: (event: never) => {
          triggerProps.onBlur?.(event);
          focusedEarly.current = false;
        },
      });
    }

    const trigger = cloneElement(triggerElement, {
      ref: (node: HTMLElement | null) => {
        setRef(triggerProps.ref, node);
        if (!node) return;
        if (focusedEarly.current) {
          focusedEarly.current = false;
          node.focus();
        }
        if (pressedEarly.current) {
          pressedEarly.current = false;
          // A click from script has detail 0, which Base UI reads as a keyboard open, so the first
          // item is focused, as it is when a keyboard opens the real trigger.
          queueMicrotask(() => node.click());
        }
      },
    });
    return <Component {...props} trigger={trigger} />;
  };
}
