"use client";

import { useEffect, useState } from "react";

export default function CountdownTimer({ duration }: { duration: number }) {
  // countdown duration in seconds
  const [timeRemaining, setTimeRemaining] = useState(duration);
  // Reset the countdown when the parent passes a new duration. Adjusting state during
  // render is the documented replacement for a prop-sync effect.
  const [lastDuration, setLastDuration] = useState(duration);
  if (lastDuration !== duration) {
    setLastDuration(duration);
    setTimeRemaining(duration);
  }

  // effect: setInterval is an external subscription; cleared on unmount or when duration changes
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimeRemaining((prevTime) => {
        if (prevTime === 0) {
          clearInterval(timerInterval);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Cleanup the interval when the component unmounts
    return () => clearInterval(timerInterval);
  }, [duration]); // The empty dependency array ensures the effect runs only once on mount

  // Convert seconds to days, hours, minutes, and seconds
  const days = Math.floor(timeRemaining / (3600 * 24));
  const hours = Math.floor((timeRemaining % (3600 * 24)) / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;

  return <span>{`${days}d ${hours}h ${minutes}m ${seconds}s`}</span>;
}
