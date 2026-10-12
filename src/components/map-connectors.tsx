"use client";
import { useEffect, useRef } from "react";

// Draws the dashed flow connectors between numbered steps from their live positions (re-drawn on resize).
export function MapConnectors({ links }: { links: [string, string][] }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const draw = () => {
      const s = svg.current;
      const host = s?.parentElement;
      if (!s || !host) return;
      const H = host.getBoundingClientRect();
      const r = (id: string) => {
        const el = host.querySelector<HTMLElement>(`[data-step="${id}"]`);
        if (!el) return null;
        const e = el.getBoundingClientRect();
        return { l: e.left - H.left, r: e.right - H.left, t: e.top - H.top, b: e.bottom - H.top, cx: (e.left + e.right) / 2 - H.left, cy: (e.top + e.bottom) / 2 - H.top };
      };
      let out = "";
      for (const [a, b] of links) {
        const A = r(a);
        const B = r(b);
        if (!A || !B) continue;
        let d: string;
        let sx: number;
        let sy: number;
        if (Math.abs(A.cx - B.cx) < 4) {
          const down = B.t > A.b;
          sx = A.cx + 22;
          sy = down ? A.b : A.t;
          d = `M${sx},${sy} L${sx},${down ? B.t : B.b}`;
        } else if (B.cx > A.cx) {
          sx = A.r;
          sy = A.cy;
          const mx = B.l - 12;
          d = `M${sx},${sy} L${mx},${sy} L${mx},${B.cy} L${B.l - 2},${B.cy}`;
        } else {
          sx = A.l;
          sy = A.cy;
          const mx = B.r + 12;
          d = `M${sx},${sy} L${mx},${sy} L${mx},${B.cy} L${B.r + 2},${B.cy}`;
        }
        out += `<path class="cmap-link" d="${d}" marker-end="url(#cmap-arrow)"/><circle class="cmap-dot" cx="${sx}" cy="${sy}" r="3.6"/>`;
      }
      s.querySelector("g")!.innerHTML = out;
    };
    draw();
    const t = setTimeout(draw, 700); // after the rise animation settles
    window.addEventListener("resize", draw);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", draw);
    };
  }, [links]);
  return (
    <svg ref={svg} className="cmap-svg" aria-hidden>
      <defs>
        <marker id="cmap-arrow" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto">
          <path d="M0,1 L8,4.5 L0,8 z" fill="var(--cmap-line)" />
        </marker>
      </defs>
      <g />
    </svg>
  );
}
