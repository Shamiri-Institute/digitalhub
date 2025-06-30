"use client";

import { useEffect, useState } from "react";

export default function CountdownTimer({ duration }: { duration: number }) {
  // countdown duration in seconds
  const [timeRemaining, setTimeRemaining] = useState(duration);

  useEffect(() => {
    setTimeRemaining(duration);
  }, [duration]);

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
