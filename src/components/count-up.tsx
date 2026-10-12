"use client";
import { useEffect, useState } from "react";

// Numbers count up on first view (revenue-app motion). Falls back to the final value without JS or with reduced motion.
export function CountUp({ to, prefix = "", suffix = "", decimals = 0, ms = 1100 }: { to: number; prefix?: string; suffix?: string; decimals?: number; ms?: number }) {
  const [v, setV] = useState(to);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setV(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{prefix}{v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}
