import { useEffect } from "react";
import confetti from "canvas-confetti";

export const ConfettiBurst = ({ onDone }) => {
  useEffect(() => {
    const durationMs = 1200;
    const end = Date.now() + durationMs;

    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 } });
      confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    if (typeof window !== "undefined") {
      frame();
    }

    const timer = setTimeout(() => {
      if (typeof onDone === "function") onDone();
    }, durationMs + 100);

    return () => clearTimeout(timer);
  }, [onDone]);

  return null;
};
