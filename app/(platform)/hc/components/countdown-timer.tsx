"use client";

import { differenceInSeconds } from "date-fns";
import { useEffect, useEffectEvent, useState } from "react";

export default function CountdownTimer({
  deadline,
  onExpire,
}: {
  deadline: Date;
  onExpire: (expiredAt: Date) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const notifyExpired = useEffectEvent(onExpire);
  const deadlineMs = deadline.getTime();

  // Each tick reads the clock, so a tab that throttles the interval still expires on its next tick.
  // effect: setInterval is an external subscription; cleared on unmount or a new deadline
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const tickedAt = new Date();
      setNow(tickedAt);
      if (tickedAt.getTime() >= deadlineMs) {
        clearInterval(timerInterval);
        notifyExpired(tickedAt);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [deadlineMs]);

  const timeRemaining = Math.max(0, differenceInSeconds(deadlineMs, now));
  const days = Math.floor(timeRemaining / (3600 * 24));
  const hours = Math.floor((timeRemaining % (3600 * 24)) / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;

  return <span>{`${days}d ${hours}h ${minutes}m ${seconds}s`}</span>;
}
