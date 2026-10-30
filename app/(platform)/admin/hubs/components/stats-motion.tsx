"use client";

import type React from "react";
import { useLayoutEffect, useRef, useState } from "react";

// The figures and the sessions bar arrive together, so both use these.
const DURATION_MS = 400;
const EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const format = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const [shown, setShown] = useState(value);
  // Counting starts from what is on screen, so a new value continues from the old one.
  const onScreen = useRef(0);

  // layouteffect: a requestAnimationFrame loop that must reset to the start value before the first paint, or the final value flashes first
  useLayoutEffect(() => {
    const start = onScreen.current;
    if (start === value || prefersReducedMotion()) {
      onScreen.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      // The frame's timestamp can be slightly earlier than startedAt.
      const progress = Math.min(Math.max((now - startedAt) / DURATION_MS, 0), 1);
      onScreen.current = start + (value - start) * easeOutExpo(progress);
      setShown(onScreen.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    setShown(start);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      <span aria-hidden className="select-none">
        {format(shown)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}

export function SweepIn({ children }: { children: React.ReactNode }) {
  const sweep = useRef<HTMLDivElement>(null);

  // layouteffect: starts the Web Animations sweep before the first paint, so the full bar never flashes
  useLayoutEffect(() => {
    if (!sweep.current || prefersReducedMotion()) return;
    const animation = sweep.current.animate(
      [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
      { duration: DURATION_MS, easing: EASING },
    );
    return () => animation.cancel();
  }, []);

  return <div ref={sweep}>{children}</div>;
}
