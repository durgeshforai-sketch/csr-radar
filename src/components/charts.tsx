import type { Bucket } from "@/lib/score";
import { TEMP } from "./ui";

// Animated SVG charts (revenue-app motion: lines draw, cells pop, rings fill). Pure server components.

export function Loader({ purple, lg }: { purple?: boolean; lg?: boolean }) {
  return (
    <span className={`loader${purple ? " purple" : ""}${lg ? " lg" : ""}`} aria-hidden>
      <i /><i /><i /><i />
    </span>
  );
}

export function TrendChart({ days }: { days: { day: string; relevant: number; total: number }[] }) {
  const W = 520, H = 190, P = { l: 28, r: 8, t: 14, b: 26 };
  const n = Math.max(days.length, 2);
  const max = Math.max(4, ...days.map((d) => d.total));
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / (n - 1);
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b);
  const smooth = (pts: [number, number][]) =>
    pts.reduce((acc, [px, py], i, a) => {
      if (!i) return `M${px},${py}`;
      const [qx, qy] = a[i - 1];
      const cx = (qx + px) / 2;
      return `${acc} C${cx},${qy} ${cx},${py} ${px},${py}`;
    }, "");
  const rel = days.map((d, i) => [x(i), y(d.relevant)] as [number, number]);
  const tot = days.map((d, i) => [x(i), y(d.total)] as [number, number]);
  const line = smooth(rel);
  const peak = days.reduce((b, d, i) => (d.relevant > days[b].relevant ? i : b), 0);
  const ticks = [0, Math.round(max / 2), max];
  const lbl = (d: string) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (!days.length) return <p className="muted small">No data yet.</p>;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Stories per day: relevant vs scanned">
      <defs>
        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--hot)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--hot)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid-line" x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} />
          <text className="axis" x={P.l - 8} y={y(t) + 4} textAnchor="end">{t}</text>
        </g>
      ))}
      <path className="area" d={`${line} L${x(days.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z`} fill="url(#trendFill)" />
      <path className="line2" d={smooth(tot)} />
      <path className="line" d={line} />
      {days.map((d, i) =>
        i % Math.ceil(days.length / 7) === 0 || i === days.length - 1 ? (
          <text key={d.day} className="axis" x={x(i)} y={H - 6} textAnchor="middle" style={i === peak ? { fill: "var(--hot)", fontWeight: 700 } : undefined}>{lbl(d.day)}</text>
        ) : null,
      )}
      <line x1={x(peak)} x2={x(peak)} y1={y(days[peak].relevant)} y2={H - P.b} stroke="var(--hot)" strokeDasharray="3 3" opacity="0.5" />
      <circle className="pt" cx={x(peak)} cy={y(days[peak].relevant)} r="5" fill="var(--surface)" stroke="var(--hot)" strokeWidth="2.5" style={{ animationDelay: "1.4s" }} />
      <g className="pt" style={{ animationDelay: "1.5s" }}>
        <rect x={x(peak) - 18} y={y(days[peak].relevant) - 32} width="36" height="21" rx="6" fill="var(--ink)" />
        <text className="tip" x={x(peak)} y={y(days[peak].relevant) - 17} textAnchor="middle" style={{ fill: "var(--surface)" }}>{days[peak].relevant}</text>
      </g>
    </svg>
  );
}

export function Heatmap({ rows, cols }: { rows: { label: string; cells: number[] }[]; cols: string[] }) {
  const max = Math.max(1, ...rows.flatMap((r) => r.cells));
  const shade = (v: number) =>
    v === 0 ? "var(--brand-soft)" : `color-mix(in srgb, var(--brand) ${Math.round(28 + (v / max) * 72)}%, var(--brand-soft))`;
  let i = 0;
  return (
    <div>
      <div className="heat">
        <div className="heat-row">
          <span />
          {cols.map((c) => <span key={c} style={{ textAlign: "center" }}>{c}</span>)}
        </div>
        {rows.map((r) => (
          <div className="heat-row" key={r.label}>
            <span title={r.label}>{r.label}</span>
            {r.cells.map((v, j) => (
              <div key={j} className="heat-cell" data-n={v || undefined} title={`${r.label} · ${cols[j]}: ${v}`} style={{ background: shade(v), ["--i" as string]: i++ }} />
            ))}
          </div>
        ))}
      </div>
      <div className="heat-scale">Less {[0, 0.25, 0.5, 0.75, 1].map((f) => <i key={f} style={{ background: shade(f * max) }} />)} More</div>
    </div>
  );
}

export function Donut({ parts, total, label }: { parts: { b: Bucket; n: number }[]; total: number; label: string }) {
  const R = 70, C = 2 * Math.PI * R;
  const sum = Math.max(1, parts.reduce((a, p) => a + p.n, 0));
  let offset = 0;
  return (
    <div>
      <div className="donut">
        <svg viewBox="0 0 168 168" width="168" height="168">
          <circle cx="84" cy="84" r={R} stroke="var(--surface-2)" style={{ animation: "none" }} />
          {parts.filter((p) => p.n > 0).map((p, i) => {
            const len = (p.n / sum) * C;
            const gap = parts.filter((x) => x.n > 0).length > 1 ? 4 : 0;
            const el = (
              <circle
                key={p.b}
                cx="84"
                cy="84"
                r={R}
                stroke={TEMP[p.b].color}
                strokeDasharray={`${Math.max(0, len - gap)} ${C}`}
                strokeDashoffset={-offset}
                style={{ strokeLinecap: "butt", animation: `fade 0.6s both ${0.15 * i}s` }}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="c"><b>{total}</b><span>{label}</span></div>
      </div>
      <div className="donut-legend">
        {parts.map((p) => (
          <div key={p.b}><i style={{ background: TEMP[p.b].color }} />{TEMP[p.b].label}<b>{p.n}</b></div>
        ))}
      </div>
    </div>
  );
}

export function ScoreRing({ v, b }: { v: number; b: Bucket }) {
  const R = 15, C = 2 * Math.PI * R;
  return (
    <span className="score-ring" title={`Radar score ${v}/100`} style={{ color: TEMP[b].color }}>
      <svg viewBox="0 0 36 36" width="36" height="36">
        <circle className="bg" cx="18" cy="18" r={R} />
        <circle className="fg" cx="18" cy="18" r={R} stroke="currentColor" strokeDasharray={C} style={{ strokeDashoffset: C * (1 - v / 100), ["--c" as string]: C }} />
      </svg>
      <span style={{ color: "var(--ink)" }}>{v}</span>
    </span>
  );
}
