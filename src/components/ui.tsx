import type { Bucket } from "@/lib/score";
import { SIGNAL_LABEL, type SignalType } from "@/lib/extract";
import { IDrop, IFlame, IScale, ISnow, ISun } from "./icons";
import { ScoreRing } from "./charts";

export const inrCrore = (cr: number) => (cr >= 100 ? `₹${Math.round(cr).toLocaleString("en-IN")} Cr` : cr >= 1 ? `₹${+cr.toFixed(1)} Cr` : `₹${Math.round(cr * 100)} L`);
export const inr = (v: number) => (v >= 1e7 ? `₹${+(v / 1e7).toFixed(2)} Cr` : v >= 1e5 ? `₹${+(v / 1e5).toFixed(1)} L` : `₹${Math.round(v).toLocaleString("en-IN")}`);

const IST = "Asia/Kolkata";
export const fmtDate = (d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  d ? new Intl.DateTimeFormat("en-IN", { timeZone: IST, ...opts }).format(new Date(d)) : "—";
export const fmtDateTime = (d: Date | string | null | undefined) => fmtDate(d, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export function ago(d: Date | string | null | undefined, now = new Date()) {
  if (!d) return "—";
  const s = (now.getTime() - new Date(d).getTime()) / 1000;
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const days = Math.round(s / 86400);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

// Temperature = the decision, with a word and an icon (never colour alone)
export const TEMP: Record<Bucket, { label: string; cls: string; Icon: () => React.JSX.Element; hint: string; color: string }> = {
  call: { label: "Hot", cls: "t-hot", Icon: IFlame, hint: "Worth a call this week", color: "var(--hot)" },
  watch: { label: "Warm", cls: "t-warm", Icon: ISun, hint: "Watch — could open up", color: "var(--warm)" },
  fyi: { label: "Cool", cls: "t-cool", Icon: IDrop, hint: "For information", color: "var(--cool)" },
  skip: { label: "Cold", cls: "t-cold", Icon: ISnow, hint: "Below the bar — her call", color: "var(--cold)" },
  policy: { label: "Policy", cls: "t-policy", Icon: IScale, hint: "Rule or regulation change", color: "var(--policy)" },
};

export function TempBadge({ b, withHint }: { b: Bucket; withHint?: boolean }) {
  const t = TEMP[b];
  return (
    <span className={`badge ${t.cls}`} title={t.hint}>
      <t.Icon />
      {t.label}
      {withHint && <span style={{ fontWeight: 500 }}>· {t.hint}</span>}
    </span>
  );
}

export function SignalChip({ t }: { t: SignalType }) {
  return <span className="chip">{SIGNAL_LABEL[t]}</span>;
}

export function Score({ v, b }: { v: number; b: Bucket }) {
  return <ScoreRing v={v} b={b} />;
}

export function Kpi({ v, l, cls, icon, tint, i }: { v: React.ReactNode; l: string; cls?: string; icon?: React.ReactNode; tint?: string; i?: number }) {
  return (
    <div className={`kpi rise ${icon ? "" : "plain"} ${cls ?? ""}`} style={{ ["--i" as string]: i ?? 0 }}>
      {icon && <span className={`ring ${tint ?? "tint-brand"}`}>{icon}</span>}
      <div>
        <div className="v">{v}</div>
        <div className="l">{l}</div>
      </div>
    </div>
  );
}

export function Bars({ items, max }: { items: { label: string; n: number; color?: string }[]; max?: number }) {
  const m = max ?? Math.max(1, ...items.map((i) => i.n));
  return (
    <div className="bars">
      {items.map((i) => (
        <div className="bar" key={i.label}>
          <span className="ink2">{i.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(i.n / m) * 100}%`, display: "block", background: i.color }} />
          </span>
          <span className="n">{i.n}</span>
        </div>
      ))}
    </div>
  );
}

export const initials = (name: string) =>
  name
    .replace(/^(dr|mr|ms|mrs)\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
